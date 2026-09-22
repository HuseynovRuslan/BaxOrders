using BaxOrders.Application.Common;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Domain;
using BaxOrders.Domain.Orders;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.ErrorHandling;

/// <summary>
/// Converts exceptions into RFC 7807 ProblemDetails responses. Business-rule violations become 422;
/// anything else is logged and returned as a 500 without internal details.
/// </summary>
internal sealed class GlobalExceptionHandler(
    IProblemDetailsService problemDetailsService,
    ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is OperationCanceledException && httpContext.RequestAborted.IsCancellationRequested)
        {
            // The client went away; there is nobody to answer.
            return true;
        }

        var problem = exception switch
        {
            // Not "this is invalid" but "say that you know": the caller gets the count and can try again.
            // Refused for a business reason rather than a permission one, so it says which.
            SelfApprovalNotAllowedException selfApproval => new ProblemDetails
            {
                Status = StatusCodes.Status422UnprocessableEntity,
                Title = "Self-approval is not allowed",
                Detail = selfApproval.Message,
                Extensions = { ["code"] = "SelfApprovalNotAllowed" },
            },

            // Also a business refusal rather than a permission one: the role is right, the person is not.
            OwnContributionNotApprovableException ownContribution => new ProblemDetails
            {
                Status = StatusCodes.Status422UnprocessableEntity,
                Title = "Own contribution is not approvable",
                Detail = ownContribution.Message,
                Extensions = { ["code"] = "OwnContributionNotApprovable" },
            },

            MissingPriceAcknowledgementRequiredException acknowledgement => new ProblemDetails
            {
                Status = StatusCodes.Status422UnprocessableEntity,
                Title = "Missing price acknowledgement required",
                Detail = acknowledgement.Message,
                Extensions =
                {
                    ["code"] = "MissingPriceAcknowledgementRequired",
                    ["missingPriceItemCount"] = acknowledgement.MissingPriceItemCount,
                },
            },

            DomainException domainException => new ProblemDetails
            {
                Status = StatusCodes.Status422UnprocessableEntity,
                Title = "Business rule violated",
                Detail = domainException.Message,
            },
            NotFoundException notFound => new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Not found",
                Detail = notFound.Message,
            },
            ForbiddenException forbidden => new ProblemDetails
            {
                Status = StatusCodes.Status403Forbidden,
                Title = "Not allowed",
                Detail = forbidden.Message,
            },

            ValidationException validation => new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Invalid request",
                Detail = validation.Message,
            },

            // A bulk operation is all or nothing, so the answer names every value that stopped it.
            BulkResolutionConflictException bulkConflict => new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "Conflicting decision",
                Detail = bulkConflict.Message,
                Extensions = { ["items"] = bulkConflict.Items },
            },

            ConflictException conflict => new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "Conflicting decision",
                Detail = conflict.Message,
            },
            BadHttpRequestException badRequest => new ProblemDetails
            {
                Status = badRequest.StatusCode,
                Title = "Invalid request",
                Detail = badRequest.StatusCode == StatusCodes.Status413PayloadTooLarge ? "The request body is too large." : null,
            },

            // Thrown by multipart form reading, for example when the upload exceeds the form length limit.
            InvalidDataException => new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Invalid request",
                Detail = "The multipart request could not be read or is too large.",
            },
            _ => new ProblemDetails
            {
                Status = StatusCodes.Status500InternalServerError,
                Title = "An unexpected error occurred",
            },
        };

        if (problem.Status >= StatusCodes.Status500InternalServerError)
        {
            logger.LogError(exception, "Unhandled exception for {Method} {Path}", httpContext.Request.Method, httpContext.Request.Path);
        }

        httpContext.Response.StatusCode = problem.Status!.Value;

        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = problem,
        });
    }
}

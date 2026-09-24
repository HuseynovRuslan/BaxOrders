using System.Text.Json.Serialization;
using BaxOrders.Api;
using BaxOrders.Api.ErrorHandling;
using BaxOrders.Application;
using BaxOrders.Application.Imports;
using Microsoft.AspNetCore.Http.Features;
using BaxOrders.Infrastructure;
using BaxOrders.Infrastructure.Identity;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

// The test environment and the real data never meet: the Sandbox environment runs only against a sandbox
// database, and no other environment ever runs against one. Checked from the connection string alone, before
// anything is registered that could reach a database.
SandboxDatabase.EnsureFits(
    builder.Environment.EnvironmentName,
    builder.Configuration.GetConnectionString(BaxOrders.Infrastructure.DependencyInjection.ConnectionStringName));

builder.Services
    .AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "BAX Orders API", Version = "v1" }));

builder.Services.AddOptions<ImportOptions>()
    .Bind(builder.Configuration.GetSection(ImportOptions.SectionName))
    .Validate(settings => settings is { MaxUploadBytes: > 0, HeaderSearchRowLimit: > 0 }, "Imports settings must be positive.")
    .ValidateOnStart();

// Let slightly larger requests through so the import service can refuse an oversized file with a clear message.
var maxUploadBytes = builder.Configuration.GetSection(ImportOptions.SectionName).Get<ImportOptions>()?.MaxUploadBytes
                     ?? new ImportOptions().MaxUploadBytes;
const long multipartOverheadBytes = 1024 * 1024;
builder.Services.Configure<FormOptions>(form => form.MultipartBodyLengthLimit = maxUploadBytes + multipartOverheadBytes);
builder.WebHost.ConfigureKestrel(kestrel => kestrel.Limits.MaxRequestBodySize = maxUploadBytes + multipartOverheadBytes);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddBaxOrdersSecurity(builder.Configuration);
builder.Services.AddDisplayNameClaim();

builder.Services.AddHealthChecks().AddDbContextCheck<BaxOrdersDbContext>("database");

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    // Development convenience only. Other environments apply reviewed migration scripts explicitly.
    if (app.Configuration.GetValue<bool>("Database:ApplyMigrationsOnStartup"))
    {
        await using var scope = app.Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<BaxOrdersDbContext>().Database.MigrateAsync();
    }
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Anonymous on purpose: a monitor has to be able to ask whether the service is up without an account.
app.MapHealthChecks("/health").AllowAnonymous();

// Roles exist from the first run, and the first administrator is created only when there is nobody at all.
await using (var scope = app.Services.CreateAsyncScope())
{
    await scope.ServiceProvider.GetRequiredService<IdentityInitializer>().InitializeAsync(
        scope.ServiceProvider.GetRequiredService<IOptions<BootstrapAdminOptions>>().Value,
        CancellationToken.None);
}

app.Run();

/// <summary>Named so the integration tests can host the real application rather than a stand-in.</summary>
public partial class Program;

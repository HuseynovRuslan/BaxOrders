using System.Text.Json.Serialization;
using BaxOrders.Api.ErrorHandling;
using BaxOrders.Application;
using BaxOrders.Application.Imports;
using Microsoft.AspNetCore.Http.Features;
using BaxOrders.Infrastructure;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

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

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();

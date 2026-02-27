using System.Net;
using System.Text.Json;
using ChessMate.Application.Abstractions;
using ChessMate.Functions.Contracts;
using Microsoft.ApplicationInsights;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Logging;

namespace ChessMate.Functions.Middleware;

public sealed class ExceptionHandlingMiddleware : IFunctionsWorkerMiddleware
{
    private const string SchemaVersion = "1.0";
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly ICorrelationContextAccessor _correlationAccessor;
    private readonly TelemetryClient _telemetryClient;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(
        ICorrelationContextAccessor correlationAccessor,
        TelemetryClient telemetryClient,
        ILogger<ExceptionHandlingMiddleware> logger)
    {
        _correlationAccessor = correlationAccessor;
        _telemetryClient = telemetryClient;
        _logger = logger;
    }

    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        try
        {
            await next(context);
        }
        catch (Exception exception)
        {
            _telemetryClient.TrackException(exception, new Dictionary<string, string>
            {
                ["FunctionName"] = context.FunctionDefinition.Name,
                ["CorrelationId"] = _correlationAccessor.CorrelationId ?? string.Empty
            });

            _logger.LogError(
                exception,
                "Unhandled exception in function {FunctionName}, correlationId {CorrelationId}.",
                context.FunctionDefinition.Name,
                _correlationAccessor.CorrelationId);

            await TryWriteErrorResponseAsync(context);
        }
    }

    private async Task TryWriteErrorResponseAsync(FunctionContext context)
    {
        var request = await context.GetHttpRequestDataAsync();
        if (request is null)
        {
            return;
        }

        var envelope = new ErrorResponseEnvelope(
            SchemaVersion,
            _correlationAccessor.CorrelationId ?? string.Empty,
            "InternalError",
            "An unexpected error occurred. Please retry or contact support.");

        var response = request.CreateResponse(HttpStatusCode.InternalServerError);
        response.Headers.Add("Content-Type", "application/json; charset=utf-8");

        var body = JsonSerializer.Serialize(envelope, SerializerOptions);
        await response.WriteStringAsync(body);

        context.GetInvocationResult().Value = response;
    }
}

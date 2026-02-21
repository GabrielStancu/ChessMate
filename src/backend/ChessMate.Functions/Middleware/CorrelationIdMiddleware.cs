using ChessMate.Application.Abstractions;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Logging;

namespace ChessMate.Functions.Middleware;

public sealed class CorrelationIdMiddleware
    : IFunctionsWorkerMiddleware
{
    private readonly ICorrelationContextAccessor _correlationAccessor;
    private readonly ILogger<CorrelationIdMiddleware> _logger;
    private const string CorrelationHeaderName = "x-correlation-id";

    public CorrelationIdMiddleware(ICorrelationContextAccessor correlationAccessor, ILogger<CorrelationIdMiddleware> logger)
    {
        _correlationAccessor = correlationAccessor;
        _logger = logger;
    }

    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        var request = await context.GetHttpRequestDataAsync();
        var correlationId = ResolveCorrelationId(request);

        _correlationAccessor.CorrelationId = correlationId;

        using var _ = _logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = correlationId
        });

        _logger.LogInformation("Handling function request {FunctionName} with correlation id {CorrelationId}.",
            context.FunctionDefinition.Name,
            correlationId);

        await next(context);

        AppendCorrelationId(context, correlationId);

        _logger.LogInformation("Completed function request {FunctionName} with correlation id {CorrelationId}.",
            context.FunctionDefinition.Name,
            correlationId);
    }

    private static string ResolveCorrelationId(HttpRequestData? request)
    {
        if (request?.Headers.TryGetValues(CorrelationHeaderName, out var correlationValues) == true)
        {
            var correlationId = correlationValues.FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(correlationId))
            {
                return correlationId;
            }
        }

        return Guid.NewGuid().ToString("N");
    }

    private static void AppendCorrelationId(FunctionContext context, string correlationId)
    {
        var response = context.GetHttpResponseData();
        if (response is null)
        {
            return;
        }

        if (!response.Headers.TryGetValues(CorrelationHeaderName, out _))
        {
            response.Headers.Add(CorrelationHeaderName, correlationId);
        }
    }
}
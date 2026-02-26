using System.Net;
using System.Text.Json;
using ChessMate.Application.Abstractions;
using ChessMate.Application.Validation;
using ChessMate.Functions.BatchCoach;
using ChessMate.Functions.Contracts;
using ChessMate.Functions.Security;
using Microsoft.ApplicationInsights;
using Microsoft.Azure.Functions.Worker.Http;

namespace ChessMate.Functions.Http;

public sealed class HttpResponseFactory(
    ICorrelationContextAccessor correlationAccessor,
    CorsPolicy corsPolicy,
    TelemetryClient telemetryClient)
{
    private const string SchemaVersion = "1.0";
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    public async Task<HttpResponseData> CreateOkAsync<TPayload>(HttpRequestData request, TPayload payload)
    {
        return await WriteJsonAsync(request, HttpStatusCode.OK, payload);
    }

    public async Task<HttpResponseData> CreateValidationErrorAsync(HttpRequestData request, RequestValidationException exception)
    {
        var envelope = new ErrorResponseEnvelope(
            SchemaVersion,
            correlationAccessor.CorrelationId,
            BatchCoachFailureCodes.ValidationError,
            exception.Message,
            exception.Errors);

        return await WriteJsonAsync(request, HttpStatusCode.BadRequest, envelope);
    }

    public async Task<HttpResponseData> CreateNotImplementedAsync(HttpRequestData request)
    {
        var envelope = new ErrorResponseEnvelope(
            SchemaVersion,
            correlationAccessor.CorrelationId,
            "NotImplemented",
            "Endpoint is not implemented yet.");

        return await WriteJsonAsync(request, HttpStatusCode.NotImplemented, envelope);
    }

    public async Task<HttpResponseData> CreateUpstreamUnavailableAsync(HttpRequestData request, string message)
    {
        var envelope = new ErrorResponseEnvelope(
            SchemaVersion,
            correlationAccessor.CorrelationId,
            BatchCoachFailureCodes.UpstreamUnavailable,
            message);

        return await WriteJsonAsync(request, HttpStatusCode.BadGateway, envelope);
    }

    public async Task<HttpResponseData> CreateConflictAsync(HttpRequestData request, string code, string message)
    {
        var envelope = new ErrorResponseEnvelope(
            SchemaVersion,
            correlationAccessor.CorrelationId,
            code,
            message);

        return await WriteJsonAsync(request, HttpStatusCode.Conflict, envelope);
    }

    public async Task<HttpResponseData> CreateForbiddenAsync(HttpRequestData request, string code, string message)
    {
        var envelope = new ErrorResponseEnvelope(
            SchemaVersion,
            correlationAccessor.CorrelationId,
            code,
            message);

        return await WriteJsonAsync(request, HttpStatusCode.Forbidden, envelope);
    }

    public Task<HttpResponseData> CreatePreflightAsync(HttpRequestData request)
    {
        var response = request.CreateResponse(HttpStatusCode.NoContent);

        if (corsPolicy.TryGetAllowedOrigin(request, out var allowedOrigin))
        {
            response.Headers.Add("Access-Control-Allow-Origin", allowedOrigin!);
            response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key");
            response.Headers.Add("Access-Control-Max-Age", "3600");
            response.Headers.Add("Vary", "Origin");
        }

        return Task.FromResult(response);
    }

    private async Task<HttpResponseData> WriteJsonAsync<TPayload>(HttpRequestData request, HttpStatusCode statusCode, TPayload payload)
    {
        var response = request.CreateResponse(statusCode);
        response.Headers.Add("Content-Type", "application/json; charset=utf-8");

        if (corsPolicy.TryGetAllowedOrigin(request, out var allowedOrigin))
        {
            response.Headers.Add("Access-Control-Allow-Origin", allowedOrigin!);
            response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key");
            response.Headers.Add("Vary", "Origin");
        }

        response.Headers.Add("X-RateLimit-Hook", "edge-policy");
        response.Headers.Add("X-RateLimit-Policy", "azure-edge");

        CopyHeaderIfPresent(request, response, "X-RateLimit-Limit");
        CopyHeaderIfPresent(request, response, "X-RateLimit-Remaining");
        CopyHeaderIfPresent(request, response, "X-RateLimit-Reset");
        CopyHeaderIfPresent(request, response, "Retry-After");

        var body = JsonSerializer.Serialize(payload, SerializerOptions);
        await response.WriteStringAsync(body);

        telemetryClient.TrackEvent(
            "api.ratelimit.hook",
            new Dictionary<string, string>
            {
                ["method"] = request.Method,
                ["path"] = request.Url.AbsolutePath,
                ["statusCode"] = ((int)statusCode).ToString(),
                ["correlationId"] = correlationAccessor.CorrelationId,
                ["edgeHeadersDetected"] = request.Headers.TryGetValues("X-RateLimit-Limit", out _) ? "true" : "false"
            });

        return response;
    }

    private static void CopyHeaderIfPresent(HttpRequestData request, HttpResponseData response, string headerName)
    {
        if (request.Headers.TryGetValues(headerName, out var values))
        {
            var value = values.FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(value))
            {
                response.Headers.Add(headerName, value);
            }
        }
    }
}
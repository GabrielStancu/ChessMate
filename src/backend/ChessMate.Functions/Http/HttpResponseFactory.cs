using System.Net;
using System.Text.Json;
using ChessMate.Application.Abstractions;
using ChessMate.Application.Validation;
using ChessMate.Functions.Contracts;
using Microsoft.Azure.Functions.Worker.Http;

namespace ChessMate.Functions.Http;

public sealed class HttpResponseFactory(ICorrelationContextAccessor correlationAccessor)
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
            "ValidationError",
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
            "UpstreamUnavailable",
            message);

        return await WriteJsonAsync(request, HttpStatusCode.BadGateway, envelope);
    }

    private static async Task<HttpResponseData> WriteJsonAsync<TPayload>(HttpRequestData request, HttpStatusCode statusCode, TPayload payload)
    {
        var response = request.CreateResponse(statusCode);
        response.Headers.Add("Content-Type", "application/json; charset=utf-8");
        var body = JsonSerializer.Serialize(payload, SerializerOptions);
        await response.WriteStringAsync(body);
        return response;
    }
}
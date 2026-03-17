using System.Net.Http.Headers;
using ChessMate.Application.Abstractions;
using ChessMate.Functions.Http;
using ChessMate.Functions.Security;
using ChessMate.Infrastructure.Configuration;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ChessMate.Functions.Functions;

public sealed class LichessExplorerFunctions
{
    private readonly HttpResponseFactory _responseFactory;
    private readonly ICorrelationContextAccessor _correlationAccessor;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IKeyVaultSecretProvider _keyVaultSecretProvider;
    private readonly LichessOptions _lichessOptions;
    private readonly CorsPolicy _corsPolicy;
    private readonly ILogger<LichessExplorerFunctions> _logger;

    public LichessExplorerFunctions(
        HttpResponseFactory responseFactory,
        ICorrelationContextAccessor correlationAccessor,
        IHttpClientFactory httpClientFactory,
        IKeyVaultSecretProvider keyVaultSecretProvider,
        IOptions<BackendOptions> backendOptions,
        CorsPolicy corsPolicy,
        ILogger<LichessExplorerFunctions> logger)
    {
        _responseFactory = responseFactory;
        _correlationAccessor = correlationAccessor;
        _httpClientFactory = httpClientFactory;
        _keyVaultSecretProvider = keyVaultSecretProvider;
        _lichessOptions = backendOptions.Value.Lichess;
        _corsPolicy = corsPolicy;
        _logger = logger;
    }

    [Function("GetLichessExplorerMasters")]
    public async Task<HttpResponseData> GetMastersAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "lichess/explorer/masters")]
        HttpRequestData request)
    {
        return await ProxyExplorerRequestAsync(request, "masters");
    }

    [Function("GetLichessExplorerLichess")]
    public async Task<HttpResponseData> GetLichessAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "lichess/explorer/lichess")]
        HttpRequestData request)
    {
        return await ProxyExplorerRequestAsync(request, "lichess");
    }

    [Function("LichessExplorerPreflight")]
    public async Task<HttpResponseData> PreflightAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "options", Route = "lichess/explorer/{*path}")]
        HttpRequestData request,
        string path)
    {
        return await _responseFactory.CreatePreflightAsync(request);
    }

    private async Task<HttpResponseData> ProxyExplorerRequestAsync(
        HttpRequestData request,
        string endpoint)
    {
        if (!_corsPolicy.IsOriginAllowed(request))
        {
            _logger.LogWarning("Lichess explorer request blocked by CORS allowlist.");
            return await _responseFactory.CreateForbiddenAsync(
                request, "CorsForbidden", "Origin is not allowed.");
        }

        var queryString = request.Url.Query;
        var upstreamUrl = $"{_lichessOptions.BaseUrl.TrimEnd('/')}/{endpoint}{queryString}";

        _logger.LogInformation(
            "Proxying Lichess explorer request to {Endpoint}, correlationId {CorrelationId}.",
            endpoint,
            _correlationAccessor.CorrelationId);

        try
        {
            var token = await _keyVaultSecretProvider.GetSecretAsync(
                _lichessOptions.TokenSecretName,
                request.FunctionContext.CancellationToken);

            using var client = _httpClientFactory.CreateClient("Lichess");
            using var upstreamRequest = new HttpRequestMessage(HttpMethod.Get, upstreamUrl);
            upstreamRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            upstreamRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            using var upstreamResponse = await client.SendAsync(
                upstreamRequest,
                request.FunctionContext.CancellationToken);

            var body = await upstreamResponse.Content.ReadAsStringAsync(
                request.FunctionContext.CancellationToken);

            if (!upstreamResponse.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Lichess explorer {Endpoint} returned {StatusCode}, correlationId {CorrelationId}.",
                    endpoint,
                    (int)upstreamResponse.StatusCode,
                    _correlationAccessor.CorrelationId);

                return await _responseFactory.CreateUpstreamUnavailableAsync(
                    request,
                    $"Lichess explorer returned {(int)upstreamResponse.StatusCode}.");
            }

            var response = request.CreateResponse(upstreamResponse.StatusCode);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");

            if (_corsPolicy.TryGetAllowedOrigin(request, out var allowedOrigin))
            {
                response.Headers.Add("Access-Control-Allow-Origin", allowedOrigin!);
                response.Headers.Add("Vary", "Origin");
            }

            await response.WriteStringAsync(body);
            return response;
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogError(
                exception,
                "Lichess explorer proxy failed for {Endpoint}, correlationId {CorrelationId}.",
                endpoint,
                _correlationAccessor.CorrelationId);

            return await _responseFactory.CreateUpstreamUnavailableAsync(
                request,
                "Failed to reach Lichess explorer API.");
        }
    }
}

using ChessMate.Application.Abstractions;
using ChessMate.Application.ChessCom;
using ChessMate.Application.Validation;
using ChessMate.Functions.Contracts;
using ChessMate.Functions.Http;
using ChessMate.Functions.Validation;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace ChessMate.Functions.Functions;

public sealed class ChessComFunctions
{
    private readonly HttpResponseFactory _responseFactory;
    private readonly ICorrelationContextAccessor _correlationAccessor;
    private readonly IChessComGamesService _chessComGamesService;
    private readonly ILogger<ChessComFunctions> _logger;

    public ChessComFunctions(HttpResponseFactory responseFactory,
        ICorrelationContextAccessor correlationAccessor,
        IChessComGamesService chessComGamesService,
        ILogger<ChessComFunctions> logger)
    {
        _responseFactory = responseFactory;
        _correlationAccessor = correlationAccessor;
        _chessComGamesService = chessComGamesService;
        _logger = logger;
    }

    [Function("GetChessComGames")]
    public async Task<HttpResponseData> GetGamesAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "api/chesscom/users/{username}/games")]
        HttpRequestData request,
        string username)
    {
        var query = System.Web.HttpUtility.ParseQueryString(request.Url.Query);
        int page;
        int pageSize;

        try
        {
            page = RequestValidators.ParseOptionalIntegerQuery(query.Get("page"), "page", 1);
            pageSize = RequestValidators.ParseOptionalIntegerQuery(query.Get("pageSize"), "pageSize", 12);
            RequestValidators.ValidateGetGamesRequest(username, page, pageSize);
        }
        catch (RequestValidationException exception)
        {
            _logger.LogWarning(exception,
                "GET games request validation failed for username {Username}, page {Page}, pageSize {PageSize}, correlationId {CorrelationId}.",
                username,
                query.Get("page"),
                query.Get("pageSize"),
                _correlationAccessor.CorrelationId);
            return await _responseFactory.CreateValidationErrorAsync(request, exception);
        }

        try
        {
            var result = await _chessComGamesService.GetGamesPageAsync(username, page, pageSize, request.FunctionContext.CancellationToken);

            _logger.LogInformation(
                "GET games request completed for username {Username}, page {Page}, pageSize {PageSize}, cacheStatus {CacheStatus}, correlationId {CorrelationId}.",
                username,
                page,
                pageSize,
                result.CacheStatus,
                _correlationAccessor.CorrelationId);

            var response = GetGamesResponseMapper.Create(result);
            return await _responseFactory.CreateOkAsync(request, response);
        }
        catch (ChessComDependencyException exception)
        {
            _logger.LogError(
                exception,
                "GET games dependency failure for username {Username}, page {Page}, pageSize {PageSize}, correlationId {CorrelationId}.",
                username,
                page,
                pageSize,
                _correlationAccessor.CorrelationId);

            return await _responseFactory.CreateUpstreamUnavailableAsync(
                request,
                "Failed to retrieve games from Chess.com upstream service.");
        }
    }
}
using ChessMate.Application.Abstractions;
using ChessMate.Application.Validation;
using ChessMate.Functions.Contracts;
using ChessMate.Functions.Http;
using ChessMate.Functions.Validation;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace ChessMate.Functions.Functions;

public sealed class ChessComFunctions(
    HttpResponseFactory responseFactory,
    ICorrelationContextAccessor correlationAccessor,
    ILogger<ChessComFunctions> logger)
{
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
            logger.LogWarning(exception,
                "GET games request validation failed for username {Username}, page {Page}, pageSize {PageSize}, correlationId {CorrelationId}.",
                username,
                query.Get("page"),
                query.Get("pageSize"),
                correlationAccessor.CorrelationId);
            return await responseFactory.CreateValidationErrorAsync(request, exception);
        }

        logger.LogInformation("GET games request accepted for username {Username}, page {Page}, pageSize {PageSize}, correlationId {CorrelationId}.",
            username,
            page,
            pageSize,
            correlationAccessor.CorrelationId);

        var response = GetGamesResponseMapper.CreateEmpty(page, pageSize, DateTimeOffset.UtcNow);

        return await responseFactory.CreateOkAsync(request, response);
    }
}
using ChessMate.Application.Validation;
using ChessMate.Functions.Http;
using ChessMate.Functions.Validation;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace ChessMate.Functions.Functions;

public sealed class ChessComFunctions(HttpResponseFactory responseFactory, ILogger<ChessComFunctions> logger)
{
    [Function("GetChessComGames")]
    public async Task<HttpResponseData> GetGamesAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "api/chesscom/users/{username}/games")]
        HttpRequestData request,
        string username)
    {
        var query = System.Web.HttpUtility.ParseQueryString(request.Url.Query);
        var page = ParseInt(query.Get("page"), 1);
        var pageSize = ParseInt(query.Get("pageSize"), 12);

        try
        {
            RequestValidators.ValidateGetGamesRequest(username, page, pageSize);
        }
        catch (RequestValidationException exception)
        {
            logger.LogWarning(exception, "GET games request validation failed.");
            return await responseFactory.CreateValidationErrorAsync(request, exception);
        }

        logger.LogInformation("GET games placeholder reached for username {Username}, page {Page}, pageSize {PageSize}.",
            username,
            page,
            pageSize);

        return await responseFactory.CreateNotImplementedAsync(request);
    }

    private static int ParseInt(string? value, int fallback)
    {
        return int.TryParse(value, out var parsedValue)
            ? parsedValue
            : fallback;
    }
}
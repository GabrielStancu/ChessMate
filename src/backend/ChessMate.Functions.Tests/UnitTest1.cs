using ChessMate.Application.Validation;
using ChessMate.Functions.BatchCoach;
using ChessMate.Functions.Contracts;
using ChessMate.Functions.Security;
using ChessMate.Functions.Validation;
using System.Net;

namespace ChessMate.Functions.Tests;

public sealed class RequestValidatorsTests
{
    [Theory]
    [InlineData(null, 1)]
    [InlineData("", 1)]
    [InlineData("   ", 1)]
    public void ParseOptionalIntegerQuery_ReturnsFallback_WhenValueIsMissing(string? value, int expected)
    {
        var actual = RequestValidators.ParseOptionalIntegerQuery(value, "page", expected);

        Assert.Equal(expected, actual);
    }

    [Fact]
    public void ParseOptionalIntegerQuery_ThrowsValidation_WhenValueIsNotInteger()
    {
        var exception = Assert.Throws<RequestValidationException>(() =>
            RequestValidators.ParseOptionalIntegerQuery("abc", "page", 1));

        Assert.Equal("Validation failed.", exception.Message);
        Assert.True(exception.Errors.ContainsKey("page"));
        Assert.Equal("page must be a valid integer.", exception.Errors["page"][0]);
    }

    [Fact]
    public void ValidateGetGamesRequest_ThrowsValidation_WhenUsernameIsInvalid()
    {
        var exception = Assert.Throws<RequestValidationException>(() =>
            RequestValidators.ValidateGetGamesRequest("*invalid*", 1, 12));

        Assert.Equal("username format is invalid.", exception.Errors["username"][0]);
    }

    [Fact]
    public void ValidateGetGamesRequest_ThrowsValidation_WhenPageIsBelowOne()
    {
        var exception = Assert.Throws<RequestValidationException>(() =>
            RequestValidators.ValidateGetGamesRequest("valid_user", 0, 12));

        Assert.Equal("page must be greater than or equal to 1.", exception.Errors["page"][0]);
    }

    [Fact]
    public void ValidateGetGamesRequest_ThrowsValidation_WhenPageSizeIsNotLocked()
    {
        var exception = Assert.Throws<RequestValidationException>(() =>
            RequestValidators.ValidateGetGamesRequest("valid_user", 1, 20));

        Assert.Equal("pageSize must be exactly 12.", exception.Errors["pageSize"][0]);
    }

    [Fact]
    public void ValidatePayloadSize_ThrowsValidation_WhenBodyExceedsLimit()
    {
        var exception = Assert.Throws<RequestValidationException>(() =>
            RequestValidators.ValidatePayloadSize(ApiSecurityOptions.MaxBatchCoachRequestBytes + 1));

        Assert.Equal("body", exception.Errors.Keys.Single());
    }

    [Fact]
    public void ValidateBatchCoachEnvelope_ThrowsValidation_WhenMovesExceedLimit()
    {
        var moves = Enumerable.Range(1, ApiSecurityOptions.MaxBatchCoachMoves + 1)
            .Select(index => new BatchCoachMoveEnvelope(index, "Mistake", true, $"m{index}"))
            .ToArray();

        var request = new BatchCoachRequestEnvelope("game-1", moves, "Quick");

        var exception = Assert.Throws<RequestValidationException>(() =>
            RequestValidators.ValidateBatchCoachEnvelope(request));

        Assert.Equal($"moves must contain at most {ApiSecurityOptions.MaxBatchCoachMoves} items.", exception.Errors["moves"][0]);
    }

    [Fact]
    public void ValidateBatchCoachEnvelope_ThrowsValidation_WhenAnalysisModeIsInvalid()
    {
        var request = new BatchCoachRequestEnvelope(
            "game-1",
            [new BatchCoachMoveEnvelope(1, "Mistake", true, "Nf3")],
            "Turbo");

        var exception = Assert.Throws<RequestValidationException>(() =>
            RequestValidators.ValidateBatchCoachEnvelope(request));

        Assert.Equal("analysisMode must be one of: Quick, Deep.", exception.Errors["AnalysisMode"][0]);
    }

    [Fact]
    public void ValidateBatchCoachEnvelope_ThrowsValidation_WhenClassificationIsInvalid()
    {
        var request = new BatchCoachRequestEnvelope(
            "game-1",
            [new BatchCoachMoveEnvelope(1, "Legendary", true, "Nf3")],
            "Quick");

        var exception = Assert.Throws<RequestValidationException>(() =>
            RequestValidators.ValidateBatchCoachEnvelope(request));

        Assert.Equal("classification is invalid.", exception.Errors["moves[0].classification"][0]);
    }
}

public sealed class GetGamesResponseMapperTests
{
    [Fact]
    public void CreateEmpty_MapsNormalizedEnvelope()
    {
        var sourceTimestamp = new DateTimeOffset(2026, 2, 21, 10, 30, 0, TimeSpan.Zero);

        var response = GetGamesResponseMapper.CreateEmpty(2, 12, sourceTimestamp);

        Assert.Equal("1.0", response.SchemaVersion);
        Assert.Empty(response.Items);
        Assert.Equal(2, response.Page);
        Assert.Equal(12, response.PageSize);
        Assert.False(response.HasMore);
        Assert.Equal(sourceTimestamp, response.SourceTimestamp);
        Assert.Equal("miss", response.CacheStatus);
        Assert.Equal(15, response.CacheTtlMinutes);
    }
}

public sealed class BatchCoachClassificationPolicyTests
{
    [Fact]
    public void SelectEligibleMoves_ReturnsOnlyMistakeMissBlunder()
    {
        var moves = new List<BatchCoachMoveEnvelope>
        {
            new(1, "Best", true, "e4"),
            new(2, "Mistake", false, "...Nc6"),
            new(3, "Miss", true, "Nf3"),
            new(4, "Excellent", false, "...d6"),
            new(5, "Blunder", true, "Bb5")
        };

        var eligible = BatchCoachClassificationPolicy.SelectEligibleMoves(moves);

        Assert.Equal(3, eligible.Count);
        Assert.All(eligible, move => Assert.True(BatchCoachClassificationPolicy.IsEligible(move.Classification)));
        Assert.Equal([2, 3, 5], eligible.Select(move => move.Ply).ToArray());
    }
}

public sealed class BatchCoachResponseMapperTests
{
    [Fact]
    public void Create_MapsUnifiedEnvelopeWithSummaryAndMetadata()
    {
        var request = new BatchCoachRequestEnvelope(
            "game-123",
            [
                new BatchCoachMoveEnvelope(1, "Best", true, "e4"),
                new BatchCoachMoveEnvelope(2, "Mistake", true, "Nf3")
            ],
            "Deep");

        var activityResults = new List<CoachMoveActivityResult>
        {
            new(2, "Mistake", true, "Nf3", "Explanation")
        };

        var completedAtUtc = new DateTimeOffset(2026, 2, 22, 12, 0, 0, TimeSpan.Zero);

        var response = BatchCoachResponseMapper.Create(request, "op-123", activityResults, completedAtUtc);

        Assert.Equal("1.0", response.SchemaVersion);
        Assert.Equal("op-123", response.OperationId);
        Assert.Equal("game-123", response.Summary.GameId);
        Assert.Equal(2, response.Summary.TotalMoves);
        Assert.Equal(1, response.Summary.EligibleMoves);
        Assert.Equal("Deep", response.Summary.AnalysisMode);
        Assert.Single(response.Coaching);
        Assert.Equal(completedAtUtc, response.Metadata.CompletedAtUtc);
        Assert.Equal(BatchCoachClassificationPolicy.EligibleClassifications, response.Metadata.EligibleClassifications);
        Assert.Empty(response.Metadata.Warnings ?? Array.Empty<BatchCoachWarningEnvelope>());
        Assert.Null(response.Metadata.FailureCode);
    }

    [Fact]
    public void Create_WithFailedMoves_MapsWarningsWithoutBreakingBasePayload()
    {
        var request = new BatchCoachRequestEnvelope(
            "game-123",
            [
                new BatchCoachMoveEnvelope(1, "Mistake", true, "Nf3"),
                new BatchCoachMoveEnvelope(2, "Blunder", false, "...Qh4")
            ],
            "Quick");

        var activityResults = new List<CoachMoveActivityResult>
        {
            new(1, "Mistake", true, "Nf3", "Explanation"),
            CoachMoveActivityResult.CreateFailure(
                new BatchCoachMoveEnvelope(2, "Blunder", false, "...Qh4"),
                "...Qh4",
                BatchCoachFailureCodes.Timeout,
                "Coach generation exceeded timeout budget of 12s.")
        };

        var completedAtUtc = new DateTimeOffset(2026, 2, 22, 12, 30, 0, TimeSpan.Zero);

        var response = BatchCoachResponseMapper.Create(request, "op-124", activityResults, completedAtUtc);

        Assert.Equal("1.0", response.SchemaVersion);
        Assert.Equal("op-124", response.OperationId);
        Assert.Equal("game-123", response.Summary.GameId);
        Assert.Equal(2, response.Summary.EligibleMoves);
        Assert.Single(response.Coaching);

        var warnings = Assert.IsType<BatchCoachWarningEnvelope[]>(response.Metadata.Warnings);
        Assert.Single(warnings);
        Assert.Equal(2, warnings[0].Ply);
        Assert.Equal(BatchCoachFailureCodes.Timeout, warnings[0].Code);
        Assert.Equal(BatchCoachFailureCodes.PartialCoaching, response.Metadata.FailureCode);
    }
}

public sealed class BatchCoachFailureCodeMapperTests
{
    [Fact]
    public void Map_With429HttpRequestException_ReturnsRateLimited()
    {
        var exception = new HttpRequestException("rate limited", null, HttpStatusCode.TooManyRequests);

        var code = BatchCoachFailureCodeMapper.Map(exception);

        Assert.Equal(BatchCoachFailureCodes.RateLimited, code);
    }

    [Fact]
    public void Map_WithTaskCanceledException_ReturnsTimeout()
    {
        var code = BatchCoachFailureCodeMapper.Map(new TaskCanceledException("timeout"));

        Assert.Equal(BatchCoachFailureCodes.Timeout, code);
    }
}

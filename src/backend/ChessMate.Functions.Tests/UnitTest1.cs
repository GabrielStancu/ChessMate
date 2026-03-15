using ChessMate.Application.Validation;
using ChessMate.Functions.Contracts;
using ChessMate.Functions.Validation;

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

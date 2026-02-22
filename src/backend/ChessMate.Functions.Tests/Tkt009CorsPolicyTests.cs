using ChessMate.Functions.Security;

namespace ChessMate.Functions.Tests;

public sealed class Tkt009CorsPolicyTests
{
    [Fact]
    public void ParseAndValidateAllowedOrigins_Throws_WhenMissing()
    {
        Assert.Throws<InvalidOperationException>(() => CorsPolicy.ParseAndValidateAllowedOrigins(null));
        Assert.Throws<InvalidOperationException>(() => CorsPolicy.ParseAndValidateAllowedOrigins("   "));
    }

    [Fact]
    public void ParseAndValidateAllowedOrigins_NormalizesAndDeduplicatesValues()
    {
        var origins = CorsPolicy.ParseAndValidateAllowedOrigins("https://APP.example.com, https://app.example.com:443, http://localhost:4200");

        Assert.Equal(2, origins.Length);
        Assert.Contains("https://app.example.com", origins);
        Assert.Contains("http://localhost:4200", origins);
    }

    [Fact]
    public void ParseAndValidateAllowedOrigins_Throws_WhenSchemeIsInvalid()
    {
        Assert.Throws<InvalidOperationException>(() => CorsPolicy.ParseAndValidateAllowedOrigins("ftp://example.com"));
    }
}

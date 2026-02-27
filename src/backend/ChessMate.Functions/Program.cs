using ChessMate.Application.Abstractions;
using ChessMate.Functions.BatchCoach;
using ChessMate.Functions.Http;
using ChessMate.Functions.Middleware;
using ChessMate.Functions.Security;
using ChessMate.Infrastructure.BatchCoach;
using ChessMate.Infrastructure.ChessCom;
using ChessMate.Infrastructure.Configuration;
using ChessMate.Infrastructure.Correlation;
using System.Net.Http.Headers;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Azure.Data.Tables;
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;

var host = new HostBuilder()
    .ConfigureAppConfiguration((context, builder) =>
    {
        builder
            .SetBasePath(context.HostingEnvironment.ContentRootPath)
            .AddJsonFile("local.settings.json", optional: true, reloadOnChange: false)
            .AddEnvironmentVariables();
    })
    .ConfigureFunctionsWorkerDefaults(worker =>
    {
        worker.UseMiddleware<CorrelationIdMiddleware>();
        worker.UseMiddleware<ExceptionHandlingMiddleware>();
    })
    .ConfigureServices((context, services) =>
    {
        services.AddApplicationInsightsTelemetryWorkerService(options =>
        {
            var telemetryConfig = context.Configuration.GetSection($"{BackendOptions.SectionName}:Telemetry");
            var enableSampling = telemetryConfig.GetValue<bool>("EnableAdaptiveSampling");
            options.EnableAdaptiveSampling = enableSampling;
        });

        services.AddSingleton<ITelemetryInitializer, CorrelationTelemetryInitializer>();

        var allowedOrigins = CorsPolicy.ParseAndValidateAllowedOrigins(
            context.Configuration[ApiSecurityOptions.CorsAllowedOriginsEnvironmentVariable]);

        services.AddSingleton(new ApiSecurityOptions
        {
            CorsAllowedOrigins = allowedOrigins
        });
        services.AddSingleton<CorsPolicy>();

        services.AddSingleton<ICorrelationContextAccessor, CorrelationContextAccessor>();
        services.AddSingleton<HttpResponseFactory>();
        services.Configure<BackendOptions>(context.Configuration.GetSection(BackendOptions.SectionName));
        services.AddSingleton(TimeProvider.System);

        // Key Vault: register SecretClient and IKeyVaultSecretProvider
        var keyVaultUri = context.Configuration[$"{BackendOptions.SectionName}:KeyVault:VaultUri"];

        if (!string.IsNullOrWhiteSpace(keyVaultUri))
        {
            var credential = new DefaultAzureCredential();
            var secretClient = new SecretClient(new Uri(keyVaultUri), credential);
            services.AddSingleton(secretClient);
            services.AddSingleton<IKeyVaultSecretProvider, KeyVaultSecretProvider>();

            // Resolve secrets from Key Vault at startup and inject into options
            services.AddSingleton<IPostConfigureOptions<BackendOptions>>(sp =>
                new KeyVaultPostConfigureOptions(sp.GetRequiredService<SecretClient>(),
                    sp.GetRequiredService<ILogger<KeyVaultPostConfigureOptions>>()));
        }

        services.AddSingleton(serviceProvider =>
        {
            var options = serviceProvider.GetRequiredService<IOptions<BackendOptions>>().Value;
            var tableServiceUri = new Uri(options.Storage.TableServiceUri);
            return new TableServiceClient(tableServiceUri, new DefaultAzureCredential());
        });

        services.AddSingleton<IGameIndexStore>(serviceProvider =>
        {
            var serviceClient = serviceProvider.GetRequiredService<TableServiceClient>();
            var logger = serviceProvider.GetRequiredService<ILogger<TableGameIndexStore>>();
            return new TableGameIndexStore(serviceClient.GetTableClient("GameIndex"), logger);
        });

        services.AddSingleton<IOperationStateStore>(serviceProvider =>
        {
            var serviceClient = serviceProvider.GetRequiredService<TableServiceClient>();
            var logger = serviceProvider.GetRequiredService<ILogger<TableOperationStateStore>>();
            return new TableOperationStateStore(serviceClient.GetTableClient("OperationState"), logger);
        });

        services.AddSingleton<IAnalysisBatchStore>(serviceProvider =>
        {
            var serviceClient = serviceProvider.GetRequiredService<TableServiceClient>();
            var logger = serviceProvider.GetRequiredService<ILogger<TableAnalysisBatchStore>>();
            return new TableAnalysisBatchStore(serviceClient.GetTableClient("AnalysisBatch"), logger);
        });

        services.AddSingleton<IRequestHashProvider, CanonicalRequestHashProvider>();
        services.AddSingleton<BatchCoachIdempotencyService>();
        services.AddHttpClient<ICoachMoveGenerator, AzureOpenAiCoachMoveGenerator>()
            .AddStandardResilienceHandler();

        services.AddSingleton<IChessComGamesService, ChessComGamesService>();
        services
            .AddHttpClient<IChessComArchiveClient, ChessComArchiveClient>((serviceProvider, client) =>
            {
                var options = serviceProvider.GetRequiredService<IOptions<BackendOptions>>().Value;
                client.BaseAddress = new Uri(options.ChessCom.BaseUrl.TrimEnd('/') + "/");
                client.DefaultRequestHeaders.UserAgent.Clear();
                client.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("ChessMate", "1.0"));
                client.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("(+https://github.com/ChessMate)"));
                client.DefaultRequestHeaders.Accept.Clear();
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            })
            .AddStandardResilienceHandler();
    })
    .Build();

host.Run();
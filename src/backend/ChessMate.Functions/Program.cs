using ChessMate.Application.Abstractions;
using ChessMate.Functions.Http;
using ChessMate.Functions.Middleware;
using ChessMate.Infrastructure.ChessCom;
using ChessMate.Infrastructure.Configuration;
using ChessMate.Infrastructure.Correlation;
using System.Net.Http.Headers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Azure.Data.Tables;
using Azure.Identity;

var host = new HostBuilder()
    .ConfigureAppConfiguration((context, builder) =>
    {
        builder
            .SetBasePath(context.HostingEnvironment.ContentRootPath)
            .AddJsonFile("appsettings.json", optional: true, reloadOnChange: false)
            .AddJsonFile("local.settings.json", optional: true, reloadOnChange: false)
            .AddEnvironmentVariables();
    })
    .ConfigureFunctionsWorkerDefaults(worker =>
    {
        worker.UseMiddleware<CorrelationIdMiddleware>();
    })
    .ConfigureServices((context, services) =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();

        services.AddSingleton<ICorrelationContextAccessor, CorrelationContextAccessor>();
        services.AddSingleton<HttpResponseFactory>();
        services.Configure<BackendOptions>(context.Configuration.GetSection(BackendOptions.SectionName));
        services.AddSingleton(TimeProvider.System);

        services.AddSingleton(serviceProvider =>
        {
            var options = serviceProvider.GetRequiredService<IOptions<BackendOptions>>().Value;
            var tableServiceUri = new Uri(options.Storage.TableServiceUri);
            var serviceClient = new TableServiceClient(tableServiceUri, new DefaultAzureCredential());
            return serviceClient.GetTableClient("GameIndex");
        });

        services.AddSingleton<IGameIndexStore, TableGameIndexStore>();
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
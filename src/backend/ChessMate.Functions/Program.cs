using ChessMate.Application.Abstractions;
using ChessMate.Functions.Http;
using ChessMate.Functions.Middleware;
using ChessMate.Infrastructure.Configuration;
using ChessMate.Infrastructure.Correlation;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

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
    })
    .Build();

host.Run();
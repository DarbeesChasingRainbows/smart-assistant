using Microsoft.AspNetCore.Hosting;
using Retention.Domain.Services;

namespace Retention.App.Services;

public class WebRootFileStoragePathProvider : IFileStoragePathProvider
{
    private readonly IWebHostEnvironment _webHostEnvironment;

    public WebRootFileStoragePathProvider(IWebHostEnvironment webHostEnvironment)
    {
        _webHostEnvironment = webHostEnvironment;
    }

    public string GetWebRootPath()
    {
        return _webHostEnvironment.WebRootPath;
    }
}

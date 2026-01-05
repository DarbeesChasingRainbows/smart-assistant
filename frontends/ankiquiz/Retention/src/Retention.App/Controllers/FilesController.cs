using Microsoft.AspNetCore.Mvc;
using Retention.Domain;
using Retention.Domain.Entities;

namespace Retention.App.Controllers;

[ApiController]
[Route("api/v1/files")]
public class FilesController : ControllerBase
{
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<FilesController> _logger;
    private readonly IMediaAssetRepository _assetRepo;

    public FilesController(IWebHostEnvironment environment, ILogger<FilesController> logger, IMediaAssetRepository assetRepo)
    {
        _environment = environment;
        _logger = logger;
        _assetRepo = assetRepo;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadFile(IFormFile file, [FromForm] Guid? entityId, [FromForm] string? entityType)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        try
        {
            // Determine folder path based on entity association
            var webRootPath = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            
            string relativeFolder;
            if (entityId.HasValue && !string.IsNullOrEmpty(entityType))
            {
                relativeFolder = Path.Combine("uploads", entityType.ToLower(), entityId.Value.ToString());
            }
            else
            {
                relativeFolder = Path.Combine("uploads", "misc");
            }

            var uploadsFolder = Path.Combine(webRootPath, relativeFolder);
            
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            // Generate unique filename
            var extension = Path.GetExtension(file.FileName);
            var uniqueName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadsFolder, uniqueName);

            // Save file to disk
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var relativePath = $"/{relativeFolder.Replace("\\", "/")}/{uniqueName}";

            // Create DB record
            var asset = MediaAsset.Create(
                file.FileName, 
                relativePath, 
                file.ContentType, 
                file.Length, 
                entityId, 
                entityType ?? "Unassigned"
            );

            await _assetRepo.AddAsync(asset);

            _logger.LogInformation("File uploaded: {FileName}, Entity: {EntityType}/{EntityId}", uniqueName, entityType, entityId);

            return Ok(new { url = relativePath, id = asset.Id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "File upload failed");
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }
}

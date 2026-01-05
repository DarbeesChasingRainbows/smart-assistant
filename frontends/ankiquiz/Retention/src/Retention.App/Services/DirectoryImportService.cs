using Retention.Domain.Services;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Retention.App.Services;

public class DirectoryImportService
{
    private readonly IDeckImportService _deckImportService;
    private readonly ILogger<DirectoryImportService> _logger;

    public DirectoryImportService(IDeckImportService deckImportService, ILogger<DirectoryImportService> logger)
    {
        _deckImportService = deckImportService;
        _logger = logger;
    }

    public async Task<int> ImportDecksFromDirectoryAsync(string rootPath)
    {
        if (!Directory.Exists(rootPath))
        {
            _logger.LogWarning("Directory not found: {RootPath}", rootPath);
            return 0;
        }

        _logger.LogInformation("Scanning directory: {RootPath}", rootPath);
        var allFiles = Directory.GetFiles(rootPath, "*.txt", SearchOption.AllDirectories);
        _logger.LogInformation("Found {Count} total .txt files", allFiles.Length);

        var deckFiles = allFiles
            .Where(f => !f.Contains("Master_Index", StringComparison.OrdinalIgnoreCase) && 
                        !f.Contains("master_index", StringComparison.OrdinalIgnoreCase) && 
                        !f.Contains("guide", StringComparison.OrdinalIgnoreCase) && 
                        !f.Contains("Guide", StringComparison.OrdinalIgnoreCase))
            .ToList();

        _logger.LogInformation("Found {Count} deck files to import after filtering", deckFiles.Count);

        int importedCount = 0;
        foreach (var file in deckFiles)
        {
            try
            {
                _logger.LogInformation("Importing {File}...", Path.GetFileName(file));
                var result = await _deckImportService.ImportDeckFromFileAsync(file);
                if (result.Success)
                {
                    importedCount++;
                }
                else
                {
                    _logger.LogError("Failed to import {File}: {Errors}", Path.GetFileName(file), string.Join(", ", result.Messages));
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception importing {File}", Path.GetFileName(file));
            }
        }

        // Step 2: Generate Cross References
        _logger.LogInformation("Generating Cross-References...");
        var xrefResult = await _deckImportService.CreateCrossReferencesAsync(rootPath);
        if (xrefResult.Success)
        {
            _logger.LogInformation("Cross-References generated successfully.");
            foreach(var msg in xrefResult.Messages) _logger.LogInformation(msg);
        }
        else
        {
            _logger.LogError("Failed to generate cross-references: {Errors}", string.Join(", ", xrefResult.Messages));
        }

        // Step 3: Import Glossaries
        _logger.LogInformation("Importing Glossaries...");
        var glossaryFiles = Directory.GetFiles(rootPath, "pronunciation_guide*.txt", SearchOption.AllDirectories);
        _logger.LogInformation("Found {Count} glossary files", glossaryFiles.Length);

        foreach (var file in glossaryFiles)
        {
            try
            {
                _logger.LogInformation("Importing Glossary {File}...", Path.GetFileName(file));
                var gResult = await _deckImportService.ImportGlossaryFromFileAsync(file);
                if (gResult.Success)
                {
                    _logger.LogInformation("Imported {Count} terms from {File}", gResult.ImportedFlashcards, Path.GetFileName(file));
                }
                else
                {
                    _logger.LogError("Failed to import glossary {File}: {Errors}", Path.GetFileName(file), string.Join(", ", gResult.Messages));
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception importing glossary {File}", Path.GetFileName(file));
            }
        }

        return importedCount;
    }
}

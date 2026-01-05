using Markdig;
using Markdig.Extensions.Tables;
using Markdig.Syntax;
using Markdig.Syntax.Inlines;
using Retention.Domain.Services;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Retention.Infrastructure.Services;

public class MasterIndexParser : IMasterIndexParser
{
    public async Task<MasterIndexData> ParseIndexFileAsync(string filePath)
    {
        if (!File.Exists(filePath)) return new MasterIndexData();

        var content = await File.ReadAllTextAsync(filePath);
        var pipeline = new MarkdownPipelineBuilder()
            .UseAdvancedExtensions()
            .Build();

        var document = Markdown.Parse(content, pipeline);
        var result = new MasterIndexData();

        // Track current context (Level header)
        string currentLevel = "General";

        foreach (var block in document)
        {
            if (block is HeadingBlock heading)
            {
                var text = GetInlineText(heading.Inline);
                if (text.Contains("FOUNDATIONAL", StringComparison.OrdinalIgnoreCase)) currentLevel = "Foundational";
                else if (text.Contains("INTERMEDIATE", StringComparison.OrdinalIgnoreCase)) currentLevel = "Intermediate";
                else if (text.Contains("EXPERT", StringComparison.OrdinalIgnoreCase)) currentLevel = "Expert";
                
                // Learning Pathways
                if (text.Contains("Path", StringComparison.OrdinalIgnoreCase) && !text.Contains("Learning Pathways"))
                {
                    // It's a specific path header, e.g. "CompTIA Security+ Path"
                    // We'll handle the following list in the ListBlock section
                }
            }
            else if (block is Table table)
            {
                ParseDeckTable(table, result, currentLevel);
            }
            else if (block is ListBlock listBlock)
            {
                // Check if the previous block was a heading related to pathways
                // Ideally we track state better, but for now, let's see if the list items look like path steps
                ParsePathList(listBlock, result);
            }
        }

        return result;
    }

    private void ParseDeckTable(Table table, MasterIndexData result, string currentLevel)
    {
        // Assuming standard structure: Deck File | Questions | Focus | ...
        var headers = new List<string>();
        
        foreach (var row in table)
        {
            if (row is TableRow tableRow)
            {
                if (tableRow.IsHeader)
                {
                    headers = tableRow.Select(cell => GetCellText((TableCell)cell)).ToList();
                    continue;
                }

                // Data row
                var cells = tableRow.Select(cell => GetCellText((TableCell)cell)).ToList();
                if (cells.Count >= 1)
                {
                    var deckFile = cells[0];
                    if (string.IsNullOrWhiteSpace(deckFile) || !deckFile.EndsWith(".txt")) continue;

                    var meta = new DeckMetadata
                    {
                        FileName = deckFile,
                        Level = currentLevel,
                        Focus = GetColumnValue(cells, headers, "Focus"),
                        Certification = GetColumnValue(cells, headers, "Certification"),
                        Tools = GetColumnValue(cells, headers, "Tools")
                    };
                    result.Decks.Add(meta);
                }
            }
        }
    }

    private string GetCellText(TableCell cell)
    {
        // TableCell contains blocks (usually ParagraphBlock)
        var text = "";
        foreach (var block in cell)
        {
            if (block is ParagraphBlock paragraph)
            {
                text += GetInlineText(paragraph.Inline) + " ";
            }
        }
        return text.Trim();
    }

    private string GetColumnValue(List<string> cells, List<string> headers, string columnName)
    {
        var index = headers.FindIndex(h => h.Contains(columnName, StringComparison.OrdinalIgnoreCase));
        if (index >= 0 && index < cells.Count)
        {
            return cells[index];
        }
        return string.Empty;
    }

    private void ParsePathList(ListBlock listBlock, MasterIndexData result)
    {
        // Identify if this is a learning path list
        // Pattern: 1. **Phase**: deck1, deck2
        
        var steps = new List<PathStep>();
        
        foreach (var item in listBlock)
        {
            if (item is ListItemBlock listItem)
            {
                var text = "";
                foreach (var block in listItem)
                {
                    if (block is ParagraphBlock paragraph)
                    {
                        text += GetInlineText(paragraph.Inline) + " ";
                    }
                }
                text = text.Trim();

                // Regex to extract "**Phase**: decks"
                var match = Regex.Match(text, @"(?:\*\*(.*?)\*\*|__(.*?)__):\s*(.*)");
                if (match.Success)
                {
                    var phase = match.Groups[1].Success ? match.Groups[1].Value : match.Groups[2].Value;
                    var content = match.Groups[3].Value;
                    
                    // Extract deck filenames (heuristic: look for .txt or snake_case words)
                    var files = ExtractDeckNames(content);
                    
                    steps.Add(new PathStep
                    {
                        Order = steps.Count + 1,
                        PhaseName = phase,
                        DeckFiles = files
                    });
                }
            }
        }

        if (steps.Any())
        {
            // We found a path. We need to name it.
            result.Pathways.Add(new LearningPath { Name = "Detected Path", Steps = steps });
        }
    }

    private List<string> ExtractDeckNames(string content)
    {
        // Look for .txt
        var matches = Regex.Matches(content, @"[\w-]+\.txt");
        if (matches.Count > 0)
        {
            return matches.Select(m => m.Value).ToList();
        }
        
        // Look for snake_case if explicit extension missing, but relying on .txt is safer for now based on file content
        return new List<string>();
    }

    private string GetInlineText(ContainerInline? inline)
    {
        if (inline == null) return string.Empty;
        var text = "";
        foreach (var child in inline)
        {
            if (child is LiteralInline literal)
            {
                text += literal.Content.ToString();
            }
            else if (child is EmphasisInline emphasis)
            {
                text += GetInlineText(emphasis);
            }
            else if (child is LinkInline link)
            {
                text += GetInlineText(link);
            }
            else if (child is CodeInline code)
            {
                text += code.Content;
            }
        }
        return text;
    }
}

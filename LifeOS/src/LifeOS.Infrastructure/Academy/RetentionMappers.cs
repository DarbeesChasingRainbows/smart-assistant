#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using LifeOS.Domain.Academy;
using LifeOS.Domain.Academy.Retention;
using LifeOS.Domain.Common;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;
using SysDateTime = System.DateTime;

namespace LifeOS.Infrastructure.Academy;

/// <summary>
/// Mappers for converting between F# Retention domain types and C# ArangoDB documents.
/// Follows the established pattern from other domain mappers in the project.
/// </summary>
public static class RetentionMappers
{
    #region Flashcard Mapping

    /// <summary>
    /// Converts a FlashcardDocument to a Flashcard domain entity.
    /// </summary>
    public static Flashcard ToDomain(FlashcardDocument doc)
    {
        var qType = RetentionInterop.QuestionTypeFromStringDefault(doc.QuestionType);
        var difficulty = RetentionInterop.DifficultyLevelFromStringDefault(doc.Difficulty);

        var metadata = new QuestionMetadata(
            qType,
            doc.Options != null && doc.Options.Count > 0
                ? FSharpOption<FSharpList<string>>.Some(ListModule.OfSeq(doc.Options))
                : FSharpOption<FSharpList<string>>.None,
            string.IsNullOrEmpty(doc.Scenario)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Scenario),
            ListModule.OfSeq(
                doc.MediaAssetIds.Select(id => RetentionInterop.MediaAssetIdFrom(Guid.Parse(id)))
            ),
            difficulty,
            doc.EstimatedTimeSeconds.HasValue
                ? FSharpOption<int>.Some(doc.EstimatedTimeSeconds.Value)
                : FSharpOption<int>.None,
            ListModule.OfSeq(doc.Tags)
        );

        var scheduling = new SchedulingData(
            doc.NextReviewDate,
            doc.IntervalDays,
            doc.Repetitions,
            doc.EaseFactor,
            doc.LastReviewDate.HasValue
                ? FSharpOption<SysDateTime>.Some(doc.LastReviewDate.Value)
                : FSharpOption<SysDateTime>.None,
            FSharpList<ReviewRecord>.Empty
        );

        var glossaryTermIds = ListModule.OfSeq(
            doc.GlossaryTermIds.Select(id => RetentionInterop.GlossaryTermIdFrom(Guid.Parse(id)))
        );

        var crossRefIds = ListModule.OfSeq(
            doc.CrossReferenceIds.Select(id =>
                RetentionInterop.CrossReferenceIdFrom(Guid.Parse(id))
            )
        );

        return FlashcardModule.createWithId(
            RetentionInterop.FlashcardIdFrom(Guid.Parse(doc.Key)),
            RetentionInterop.DeckIdFrom(Guid.Parse(doc.DeckId)),
            doc.Question,
            doc.Answer,
            metadata,
            scheduling,
            glossaryTermIds,
            crossRefIds,
            doc.CreatedAt,
            doc.UpdatedAt
        );
    }

    /// <summary>
    /// Converts a Flashcard domain entity to a FlashcardDocument.
    /// </summary>
    public static FlashcardDocument ToDocument(Flashcard flashcard)
    {
        return new FlashcardDocument
        {
            Key = RetentionInterop.GetFlashcardIdValue(flashcard.Id).ToString(),
            DeckId = RetentionInterop.GetDeckIdValue(flashcard.DeckId).ToString(),
            Question = flashcard.Question,
            Answer = flashcard.Answer,
            QuestionType = RetentionInterop.QuestionTypeToString(flashcard.Metadata.QuestionType),
            Difficulty = RetentionInterop.DifficultyLevelToString(flashcard.Metadata.Difficulty),
            Tags = flashcard.Metadata.Tags.ToList(),
            Options = FSharpOption<FSharpList<string>>.get_IsSome(flashcard.Metadata.Options)
                ? flashcard.Metadata.Options.Value.ToList()
                : null,
            Scenario = FSharpOption<string>.get_IsSome(flashcard.Metadata.Scenario)
                ? flashcard.Metadata.Scenario.Value
                : null,
            MediaAssetIds = flashcard
                .Metadata.MediaAssets.Select(id =>
                    RetentionInterop.GetMediaAssetIdValue(id).ToString()
                )
                .ToList(),
            EstimatedTimeSeconds = FSharpOption<int>.get_IsSome(
                flashcard.Metadata.EstimatedTimeSeconds
            )
                ? flashcard.Metadata.EstimatedTimeSeconds.Value
                : null,
            NextReviewDate = flashcard.Scheduling.NextReviewDate,
            IntervalDays = flashcard.Scheduling.IntervalDays,
            Repetitions = flashcard.Scheduling.Repetitions,
            EaseFactor = flashcard.Scheduling.EaseFactor,
            LastReviewDate = FSharpOption<SysDateTime>.get_IsSome(flashcard.Scheduling.LastReviewDate)
                ? flashcard.Scheduling.LastReviewDate.Value
                : null,
            GlossaryTermIds = flashcard
                .GlossaryTermIds.Select(id =>
                    RetentionInterop.GetGlossaryTermIdValue(id).ToString()
                )
                .ToList(),
            CrossReferenceIds = flashcard
                .CrossReferenceIds.Select(id =>
                    RetentionInterop.GetCrossReferenceIdValue(id).ToString()
                )
                .ToList(),
            CreatedAt = flashcard.CreatedAt,
            UpdatedAt = flashcard.UpdatedAt,
        };
    }

    #endregion

    #region Deck Mapping

    /// <summary>
    /// Converts a DeckDocument to a Deck domain entity.
    /// </summary>
    public static Deck ToDomain(DeckDocument doc)
    {
        var difficulty = RetentionInterop.DifficultyLevelFromStringDefault(doc.DifficultyLevel);

        var skillMappings = ListModule.OfSeq(doc.SkillMappings.Select(sm => ToDomain(sm)));

        return DeckModule.createWithId(
            RetentionInterop.DeckIdFrom(Guid.Parse(doc.Key)),
            doc.Name,
            doc.Description,
            doc.Category,
            doc.Subcategory,
            difficulty,
            skillMappings,
            string.IsNullOrEmpty(doc.ShareToken)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.ShareToken),
            doc.FlashcardCount,
            doc.CreatedAt,
            doc.UpdatedAt
        );
    }

    /// <summary>
    /// Converts a Deck domain entity to a DeckDocument.
    /// </summary>
    public static DeckDocument ToDocument(Deck deck)
    {
        return new DeckDocument
        {
            Key = RetentionInterop.GetDeckIdValue(deck.Id).ToString(),
            Name = deck.Name,
            Description = deck.Description,
            Category = deck.Category,
            Subcategory = deck.Subcategory,
            DifficultyLevel = RetentionInterop.DifficultyLevelToString(deck.DifficultyLevel),
            SkillMappings = deck.SkillMappings.Select(sm => ToDocument(sm)).ToList(),
            ShareToken = FSharpOption<string>.get_IsSome(deck.ShareToken)
                ? deck.ShareToken.Value
                : null,
            FlashcardCount = deck.FlashcardCount,
            CreatedAt = deck.CreatedAt,
            UpdatedAt = deck.UpdatedAt,
        };
    }

    #endregion

    #region SkillMapping Mapping

    /// <summary>
    /// Converts a SkillMappingDocument to a SkillMapping domain value object.
    /// </summary>
    public static SkillMapping ToDomain(SkillMappingDocument doc)
    {
        var mappingType = RetentionInterop.MappingTypeFromStringDefault(doc.MappingType);

        return new SkillMapping(
            Domain.Academy.AcademyId.createSkillId(), // Will be replaced with actual ID from doc
            mappingType,
            doc.RelevanceWeight,
            doc.PrerequisiteLevel.HasValue
                ? FSharpOption<int>.Some(doc.PrerequisiteLevel.Value)
                : FSharpOption<int>.None
        );
    }

    /// <summary>
    /// Converts a SkillMapping domain value object to a SkillMappingDocument.
    /// </summary>
    public static SkillMappingDocument ToDocument(SkillMapping mapping)
    {
        return new SkillMappingDocument
        {
            SkillId = Domain.Academy.AcademyId.skillIdValue(mapping.SkillId).ToString(),
            MappingType = RetentionInterop.MappingTypeToString(mapping.MappingType),
            RelevanceWeight = mapping.RelevanceWeight,
            PrerequisiteLevel = FSharpOption<int>.get_IsSome(mapping.PrerequisiteLevel)
                ? mapping.PrerequisiteLevel.Value
                : null,
        };
    }

    #endregion

    #region QuizResult Mapping

    /// <summary>
    /// Converts a QuizResultDocument to a QuizResult domain entity.
    /// </summary>
    public static QuizResult ToDomain(QuizResultDocument doc)
    {
        var rating = RetentionInterop.AssessmentRatingFromStringDefault(doc.AssessmentRating);
        var difficulty = RetentionInterop.DifficultyLevelFromStringDefault(doc.Difficulty);
        var sessionType = RetentionInterop.SessionTypeFromStringDefault(doc.SessionType);

        var context = new QuizContext(
            sessionType,
            string.IsNullOrEmpty(doc.DeviceType)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.DeviceType),
            string.IsNullOrEmpty(doc.Location)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Location),
            FSharpList<QuizResultId>.Empty
        );

        return QuizResultModule.createWithId(
            RetentionInterop.QuizResultIdFrom(Guid.Parse(doc.Key)),
            Id.createUserIdFrom(Guid.Parse(doc.UserId)),
            RetentionInterop.DeckIdFrom(Guid.Parse(doc.DeckId)),
            RetentionInterop.FlashcardIdFrom(Guid.Parse(doc.FlashcardId)),
            string.IsNullOrEmpty(doc.SkillId)
                ? FSharpOption<Domain.Academy.SkillId>.None
                : FSharpOption<Domain.Academy.SkillId>.Some(
                    RetentionInterop.SkillIdFrom(Guid.Parse(doc.SkillId))
                ),
            doc.IsCorrect,
            rating,
            difficulty,
            TimeSpan.FromMilliseconds(doc.TimeToAnswerMs),
            string.IsNullOrEmpty(doc.RawAnswer)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.RawAnswer),
            doc.AnsweredAt,
            context
        );
    }

    /// <summary>
    /// Converts a QuizResult domain entity to a QuizResultDocument.
    /// </summary>
    public static QuizResultDocument ToDocument(QuizResult result)
    {
        return new QuizResultDocument
        {
            Key = RetentionInterop.GetQuizResultIdValue(result.Id).ToString(),
            UserId = Id.userIdValue(result.UserId).ToString(),
            DeckId = RetentionInterop.GetDeckIdValue(result.DeckId).ToString(),
            FlashcardId = RetentionInterop.GetFlashcardIdValue(result.FlashcardId).ToString(),
            SkillId = FSharpOption<Domain.Academy.SkillId>.get_IsSome(result.SkillId)
                ? Domain.Academy.AcademyId.skillIdValue(result.SkillId.Value).ToString()
                : null,
            IsCorrect = result.IsCorrect,
            AssessmentRating = RetentionInterop.AssessmentRatingToString(result.AssessmentRating),
            Difficulty = RetentionInterop.DifficultyLevelToString(result.Difficulty),
            TimeToAnswerMs = (long)result.TimeToAnswer.TotalMilliseconds,
            RawAnswer = FSharpOption<string>.get_IsSome(result.RawAnswer)
                ? result.RawAnswer.Value
                : null,
            AnsweredAt = result.AnsweredAt,
            SessionType = RetentionInterop.SessionTypeToString(result.Context.SessionType),
            DeviceType = FSharpOption<string>.get_IsSome(result.Context.DeviceType)
                ? result.Context.DeviceType.Value
                : null,
            Location = FSharpOption<string>.get_IsSome(result.Context.Location)
                ? result.Context.Location.Value
                : null,
        };
    }

    #endregion

    #region QuizSession Mapping

    /// <summary>
    /// Converts a QuizSessionDocument to a QuizSession domain entity.
    /// </summary>
    public static QuizSession ToDomain(QuizSessionDocument doc)
    {
        var difficultyOption = string.IsNullOrEmpty(doc.Difficulty)
            ? FSharpOption<DifficultyLevel>.None
            : FSharpOption<DifficultyLevel>.Some(RetentionInterop.DifficultyLevelFromStringDefault(doc.Difficulty));

        var sessionType = RetentionInterop.SessionTypeFromStringDefault(doc.SessionType);

        return new QuizSession(
            RetentionInterop.QuizSessionIdFrom(Guid.Parse(doc.Key)),
            Id.createUserIdFrom(Guid.Parse(doc.UserId)),
            ListModule.OfSeq(doc.DeckIds.Select(id => RetentionInterop.DeckIdFrom(Guid.Parse(id)))),
            ListModule.OfSeq(
                doc.SkillIds.Select(id => RetentionInterop.SkillIdFrom(Guid.Parse(id)))
            ),
            difficultyOption,
            sessionType,
            ListModule.OfSeq(doc.FlashcardIds.Select(id => RetentionInterop.FlashcardIdFrom(Guid.Parse(id)))),
            doc.CurrentIndex,
            ListModule.OfSeq(doc.ResultIds.Select(id => RetentionInterop.QuizResultIdFrom(Guid.Parse(id)))),
            doc.GeneratedAt,
            doc.ExpiresAt.HasValue
                ? FSharpOption<SysDateTime>.Some(doc.ExpiresAt.Value)
                : FSharpOption<SysDateTime>.None,
            doc.CompletedAt.HasValue
                ? FSharpOption<SysDateTime>.Some(doc.CompletedAt.Value)
                : FSharpOption<SysDateTime>.None
        );
    }

    /// <summary>
    /// Converts a QuizSession domain entity to a QuizSessionDocument.
    /// </summary>
    public static QuizSessionDocument ToDocument(QuizSession session)
    {
        return new QuizSessionDocument
        {
            Key = RetentionInterop.GetQuizSessionIdValue(session.Id).ToString(),
            UserId = Id.userIdValue(session.UserId).ToString(),
            DeckIds = session
                .DeckIds.Select(id => RetentionInterop.GetDeckIdValue(id).ToString())
                .ToList(),
            SkillIds = session
                .SkillIds.Select(id => Domain.Academy.AcademyId.skillIdValue(id).ToString())
                .ToList(),
            Difficulty = FSharpOption<DifficultyLevel>.get_IsSome(session.Difficulty)
                ? RetentionInterop.DifficultyLevelToString(session.Difficulty.Value)
                : null,
            SessionType = RetentionInterop.SessionTypeToString(session.SessionType),
            FlashcardIds = session
                .FlashcardIds.Select(id => RetentionInterop.GetFlashcardIdValue(id).ToString())
                .ToList(),
            ResultIds = session
                .Results.Select(id => RetentionInterop.GetQuizResultIdValue(id).ToString())
                .ToList(),
            CurrentIndex = session.CurrentIndex,
            GeneratedAt = session.GeneratedAt,
            ExpiresAt = FSharpOption<SysDateTime>.get_IsSome(session.ExpiresAt)
                ? session.ExpiresAt.Value
                : null,
            CompletedAt = FSharpOption<SysDateTime>.get_IsSome(session.CompletedAt)
                ? session.CompletedAt.Value
                : null,
        };
    }

    #endregion

    #region GlossaryTerm Mapping

    /// <summary>
    /// Converts a GlossaryTermDocument to a GlossaryTerm domain entity.
    /// </summary>
    public static GlossaryTerm ToDomain(GlossaryTermDocument doc)
    {
        return new GlossaryTerm(
            RetentionInterop.GlossaryTermIdFrom(Guid.Parse(doc.Key)),
            doc.Term,
            string.IsNullOrEmpty(doc.Pronunciation)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Pronunciation),
            doc.Definition,
            string.IsNullOrEmpty(doc.Etymology)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Etymology),
            doc.Category,
            string.IsNullOrEmpty(doc.AudioAssetId)
                ? FSharpOption<MediaAssetId>.None
                : FSharpOption<MediaAssetId>.Some(
                    RetentionInterop.MediaAssetIdFrom(Guid.Parse(doc.AudioAssetId))
                ),
            doc.CreatedAt
        );
    }

    /// <summary>
    /// Converts a GlossaryTerm domain entity to a GlossaryTermDocument.
    /// </summary>
    public static GlossaryTermDocument ToDocument(GlossaryTerm term)
    {
        return new GlossaryTermDocument
        {
            Key = RetentionInterop.GetGlossaryTermIdValue(term.Id).ToString(),
            Term = term.Term,
            Pronunciation = FSharpOption<string>.get_IsSome(term.Pronunciation)
                ? term.Pronunciation.Value
                : null,
            Definition = term.Definition,
            Etymology = FSharpOption<string>.get_IsSome(term.Etymology)
                ? term.Etymology.Value
                : null,
            Category = term.Category,
            AudioAssetId = FSharpOption<MediaAssetId>.get_IsSome(term.AudioAssetId)
                ? RetentionInterop.GetMediaAssetIdValue(term.AudioAssetId.Value).ToString()
                : null,
            CreatedAt = term.CreatedAt,
        };
    }

    #endregion

    #region CrossReference Mapping

    /// <summary>
    /// Converts a CrossReferenceDocument to a CrossReference domain entity.
    /// </summary>
    public static CrossReference ToDomain(CrossReferenceDocument doc)
    {
        var sourceType = RetentionInterop.EntityTypeFromStringDefault(doc.SourceType);
        var targetType = RetentionInterop.EntityTypeFromStringDefault(doc.TargetType);
        var referenceType = RetentionInterop.ReferenceTypeFromStringDefault(doc.ReferenceType);

        // Extract source and target IDs from ArangoDB _from/_to format (collection/key)
        var sourceId = ExtractIdFromArangoRef(doc.From);
        var targetId = ExtractIdFromArangoRef(doc.To);

        return new CrossReference(
            RetentionInterop.CrossReferenceIdFrom(Guid.Parse(doc.Key)),
            sourceType,
            sourceId,
            targetType,
            targetId,
            referenceType,
            string.IsNullOrEmpty(doc.Description)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Description),
            doc.Strength,
            doc.CreatedAt
        );
    }

    /// <summary>
    /// Converts a CrossReference domain entity to a CrossReferenceDocument.
    /// </summary>
    public static CrossReferenceDocument ToDocument(CrossReference crossRef)
    {
        var sourceCollection = GetCollectionForEntityType(crossRef.SourceType);
        var targetCollection = GetCollectionForEntityType(crossRef.TargetType);

        return new CrossReferenceDocument
        {
            Key = RetentionInterop.GetCrossReferenceIdValue(crossRef.Id).ToString(),
            From = $"{sourceCollection}/{crossRef.SourceId}",
            To = $"{targetCollection}/{crossRef.TargetId}",
            SourceType = RetentionInterop.EntityTypeToString(crossRef.SourceType),
            TargetType = RetentionInterop.EntityTypeToString(crossRef.TargetType),
            ReferenceType = RetentionInterop.ReferenceTypeToString(crossRef.ReferenceType),
            Description = FSharpOption<string>.get_IsSome(crossRef.Description)
                ? crossRef.Description.Value
                : null,
            Strength = crossRef.Strength,
            CreatedAt = crossRef.CreatedAt,
        };
    }

    #endregion

    #region Helper Methods

    /// <summary>
    /// Extracts the GUID from an ArangoDB reference format (collection/key).
    /// </summary>
    private static Guid ExtractIdFromArangoRef(string arangoRef)
    {
        var parts = arangoRef.Split('/');
        return parts.Length > 1 ? Guid.Parse(parts[1]) : Guid.Parse(parts[0]);
    }

    /// <summary>
    /// Gets the ArangoDB collection name for a given entity type.
    /// </summary>
    private static string GetCollectionForEntityType(EntityType entityType)
    {
        return entityType switch
        {
            var t when t.Equals(EntityType.FlashcardEntity) => "academy_flashcards",
            var t when t.Equals(EntityType.DeckEntity) => "academy_decks",
            var t when t.Equals(EntityType.GlossaryTermEntity) => "academy_glossary_terms",
            var t when t.Equals(EntityType.SkillEntity) => "academy_skills",
            _ => "academy_flashcards",
        };
    }

    #endregion
}

// Input validation and sanitization utilities

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class Validator {
  // VIN validation
  static validateVin(vin: string): string {
    if (!vin) return "";

    const cleanVin = vin.replace(/[\s-]/g, "").toUpperCase();

    if (cleanVin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin)) {
      throw new ValidationError(
        "VIN must be 17 characters long and contain only letters and numbers",
      );
    }

    return cleanVin;
  }

  // Vehicle make/model validation
  static validateMake(make: string): string {
    if (!make || make.trim().length === 0) {
      throw new ValidationError("Make is required");
    }

    const cleanMake = make.trim().replace(/[<>]/g, "");
    if (cleanMake.length > 100) {
      throw new ValidationError("Make must be 100 characters or less");
    }

    return cleanMake;
  }

  static validateModel(model: string): string {
    if (!model || model.trim().length === 0) {
      throw new ValidationError("Model is required");
    }

    const cleanModel = model.trim().replace(/[<>]/g, "");
    if (cleanModel.length > 100) {
      throw new ValidationError("Model must be 100 characters or less");
    }

    return cleanModel;
  }

  // Year validation
  static validateYear(year: string | number): number {
    const yearNum = typeof year === "string" ? parseInt(year) : year;

    if (
      isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1
    ) {
      throw new ValidationError("Please enter a valid year");
    }

    return yearNum;
  }

  // Mileage validation
  static validateMileage(
    mileage: string | number | null | undefined,
  ): number | undefined {
    if (mileage === null || mileage === undefined || mileage === "") {
      return undefined; // Optional field
    }

    const mileageNum = typeof mileage === "string"
      ? parseInt(mileage)
      : mileage;

    if (isNaN(mileageNum) || mileageNum < 0 || mileageNum > 10000000) {
      throw new ValidationError(
        "Mileage must be a positive number less than 10,000,000",
      );
    }

    return mileageNum;
  }

  // Cost validation
  static validateCost(
    cost: string | number | null | undefined,
  ): number | undefined {
    if (cost === null || cost === undefined || cost === "") {
      return undefined;
    }

    const costNum = typeof cost === "string" ? parseFloat(cost) : cost;

    if (isNaN(costNum) || costNum < 0 || costNum > 100000) {
      throw new ValidationError(
        "Cost must be a positive number less than $100,000",
      );
    }

    return Math.round(costNum * 100) / 100; // Round to 2 decimal places
  }

  // Hours validation
  static validateHours(
    hours: string | number | null | undefined,
  ): number | undefined {
    if (hours === null || hours === undefined || hours === "") {
      return undefined;
    }

    const hoursNum = typeof hours === "string" ? parseFloat(hours) : hours;

    if (isNaN(hoursNum) || hoursNum < 0 || hoursNum > 1000) {
      throw new ValidationError(
        "Hours must be a positive number less than 1000",
      );
    }

    return Math.round(hoursNum * 4) / 4; // Round to nearest 15 minutes
  }

  // Required date validation (for maintenance records, etc.)
  static validateRequiredDate(date: string | null | undefined): string {
    if (!date || date.trim().length === 0) {
      throw new ValidationError("Date is required");
    }

    return this.validateDate(date)!; // We know it's not undefined here
  }

  // Date validation (optional)
  static validateDate(date: string | null | undefined): string | undefined {
    if (!date || date.trim().length === 0) {
      return undefined; // Optional field
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new ValidationError("Invalid date format");
    }

    // Don't allow future dates (except for current date)
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (dateObj > today) {
      throw new ValidationError("Date cannot be in the future");
    }

    return date;
  }

  // Text field validation
  static validateText(
    text: string | null | undefined,
    fieldName: string,
    maxLength: number = 200,
  ): string | undefined {
    if (!text || text.trim().length === 0) {
      return undefined;
    }

    const cleanText = text.trim().replace(/[<>]/g, "");

    if (cleanText.length > maxLength) {
      throw new ValidationError(
        `${fieldName} must be ${maxLength} characters or less`,
      );
    }

    return cleanText;
  }

  // License plate validation
  static validateLicensePlate(
    plate: string | null | undefined,
  ): string | undefined {
    return this.validateText(plate, "License plate", 20);
  }

  // Color validation
  static validateColor(color: string | null | undefined): string | undefined {
    return this.validateText(color, "Color", 50);
  }

  // Service provider validation
  static validateServiceProvider(
    provider: string | null | undefined,
  ): string | undefined {
    return this.validateText(provider, "Service provider", 200);
  }

  // Notes validation
  static validateNotes(notes: string | null | undefined): string | undefined {
    if (!notes || notes.trim().length === 0) {
      return undefined;
    }

    const cleanNotes = notes.trim().replace(/[<>]/g, "");

    if (cleanNotes.length > 2000) {
      throw new ValidationError("Notes must be 2000 characters or less");
    }

    return cleanNotes;
  }

  // Vehicle type validation
  static validateVehicleType(type: string): "car" | "rv" {
    if (type !== "car" && type !== "rv") {
      throw new ValidationError("Vehicle type must be 'car' or 'rv'");
    }

    return type as "car" | "rv";
  }

  // UUID validation
  static validateUuid(id: string): string {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!id || !uuidRegex.test(id)) {
      throw new ValidationError("Invalid ID format");
    }

    return id;
  }
}

// Sanitize HTML to prevent XSS
export function sanitizeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Format currency safely
export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// Format mileage safely
export function formatMileage(mileage: number): string {
  return mileage.toLocaleString("en-US") + " miles";
}

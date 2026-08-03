using MarketPro.Domain.Enums;

namespace MarketPro.Application.Pos.Dtos;

public record PosProductDto(
    Guid Id,
    string Sku,
    string? Barcode,
    string NameAr,
    string? NameEn,
    decimal SellPrice,
    decimal? DiscountPrice,
    decimal TaxRate,
    decimal StockQty,
    UnitType Unit,
    string? ImageUrl,
    Guid CategoryId,
    string CategoryNameAr
);

public record PosCategoryDto(
    Guid Id,
    string NameAr,
    string? IconName,
    string? ColorHex,
    int ProductCount
);

public record CartItemDto(Guid ProductId, decimal Quantity, decimal? OverrideUnitPrice, decimal LineDiscount);

public record CreateSaleRequest(
    Guid? CustomerId,
    PaymentMethod PaymentMethod,
    decimal PaidAmount,
    decimal DiscountAmount,
    string? Notes,
    List<CartItemDto> Items
);

public record SaleSummaryDto(
    Guid Id,
    string InvoiceNumber,
    DateTime SaleDate,
    decimal SubTotal,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal Total,
    decimal PaidAmount,
    decimal ChangeAmount,
    PaymentMethod PaymentMethod,
    string CashierName,
    string? CustomerName,
    List<SaleLineDto> Items,
    string QrPayload,
    StoreInfoDto Store
);

public record StoreInfoDto(
    string NameAr,
    string NameEn,
    string AddressAr,
    string Phone,
    string TaxNumber,
    string Currency,
    string LogoUrl,
    string FooterAr,
    string FooterEn,
    int ReceiptWidthMm
);

public record SaleLineDto(
    string ProductName,
    decimal Quantity,
    decimal UnitPrice,
    decimal DiscountAmount,
    decimal TaxRate,
    decimal LineTotal,
    UnitType Unit
);

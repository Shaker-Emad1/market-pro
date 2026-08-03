namespace MarketPro.Application.Common.Settings;

/// <summary>
/// Store-level branding and tax info, surfaced to the SPA so the receipt
/// renderer can produce a real, ZATCA-style commercial receipt.
/// </summary>
public class StoreSettings
{
    public string NameAr { get; set; } = "ماركت برو";
    public string NameEn { get; set; } = "Market Pro";
    public string AddressAr { get; set; } = "الرياض، المملكة العربية السعودية";
    public string Phone { get; set; } = "+966 50 000 0000";
    public string TaxNumber { get; set; } = "300000000000003";
    public string Currency { get; set; } = "ر.س";
    public string LogoUrl { get; set; } = "";
    public string FooterAr { get; set; } = "شكراً لتسوقكم معنا";
    public string FooterEn { get; set; } = "Thank you for shopping with us";
    public int ReceiptWidthMm { get; set; } = 58;
}

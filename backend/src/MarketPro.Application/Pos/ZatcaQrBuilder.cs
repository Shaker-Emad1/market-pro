using System.Text;
using MarketPro.Application.Common.Settings;

namespace MarketPro.Application.Pos;

/// <summary>
/// Builds a ZATCA Phase-1 (e-invoicing) TLV-encoded base64 QR string.
/// Tag 1: seller name, 2: VAT number, 3: timestamp ISO, 4: total, 5: VAT amount.
/// Even when not strictly required, this gives the receipt a real, scannable QR
/// that aligns with KSA retail conventions.
/// </summary>
public static class ZatcaQrBuilder
{
    public static string Build(StoreSettings store, DateTime saleUtc, decimal total, decimal vat)
    {
        var ts = saleUtc.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ");

        var bytes = new List<byte>();
        AppendTlv(bytes, 1, store.NameAr);
        AppendTlv(bytes, 2, store.TaxNumber);
        AppendTlv(bytes, 3, ts);
        AppendTlv(bytes, 4, total.ToString("0.00"));
        AppendTlv(bytes, 5, vat.ToString("0.00"));
        return Convert.ToBase64String(bytes.ToArray());
    }

    private static void AppendTlv(List<byte> buf, byte tag, string value)
    {
        var v = Encoding.UTF8.GetBytes(value);
        buf.Add(tag);
        buf.Add((byte)v.Length);
        buf.AddRange(v);
    }
}

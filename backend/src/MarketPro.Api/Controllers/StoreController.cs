using MarketPro.Application.Common.Settings;
using MarketPro.Application.Pos.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace MarketPro.Api.Controllers;

[ApiController]
[Route("api/store")]
public class StoreController : ControllerBase
{
    private readonly StoreSettings _store;
    public StoreController(IOptions<StoreSettings> store) => _store = store.Value;

    [HttpGet]
    [AllowAnonymous]
    public ActionResult<StoreInfoDto> Get() => Ok(new StoreInfoDto(
        _store.NameAr, _store.NameEn, _store.AddressAr,
        _store.Phone, _store.TaxNumber, _store.Currency,
        _store.LogoUrl, _store.FooterAr, _store.FooterEn,
        _store.ReceiptWidthMm));
}

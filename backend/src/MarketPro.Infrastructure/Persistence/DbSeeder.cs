using MarketPro.Domain.Entities;
using MarketPro.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MarketPro.Infrastructure.Persistence;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        await db.Database.EnsureCreatedAsync();

        // 1. Seed Users
        User adminUser = null!;
        User cashierUser = null!;

        if (!await db.Users.AnyAsync())
        {
            adminUser = new User
            {
                Username = "admin",
                FullName = "مدير النظام",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                Role = UserRole.Admin
            };
            cashierUser = new User
            {
                Username = "cashier",
                FullName = "كاشير افتراضي",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("cashier123"),
                Role = UserRole.Cashier
            };
            db.Users.Add(adminUser);
            db.Users.Add(cashierUser);
            await db.SaveChangesAsync();
        }
        else
        {
            adminUser = await db.Users.FirstAsync(u => u.Username == "admin");
            cashierUser = await db.Users.FirstAsync(u => u.Username == "cashier");
        }

        // 2. Check if we need to seed new categories & 50+ realistic Arabic products
        if (!await db.Categories.AnyAsync(c => c.NameAr == "عطارة"))
        {
            // Clear existing simple categories/products/sales to start fresh and clean
            var oldSales = await db.Sales.ToListAsync();
            db.Sales.RemoveRange(oldSales);

            var oldMovements = await db.InventoryMovements.ToListAsync();
            db.InventoryMovements.RemoveRange(oldMovements);

            var oldProducts = await db.Products.ToListAsync();
            db.Products.RemoveRange(oldProducts);

            var oldCategories = await db.Categories.ToListAsync();
            db.Categories.RemoveRange(oldCategories);

            var oldCustomers = await db.Customers.ToListAsync();
            db.Customers.RemoveRange(oldCustomers);

            await db.SaveChangesAsync();

            // Seed new categories
            var cats = new List<Category>
            {
                new() { NameAr = "عطارة", NameEn = "Spices & Herbs", IconName = "leaf", ColorHex = "#E2B93C", DisplayOrder = 1 },
                new() { NameAr = "بقوليات", NameEn = "Legumes & Grains", IconName = "circle", ColorHex = "#27AE60", DisplayOrder = 2 },
                new() { NameAr = "بهارات", NameEn = "Spice Blends", IconName = "flame", ColorHex = "#D35400", DisplayOrder = 3 },
                new() { NameAr = "أعشاب", NameEn = "Herbs", IconName = "heart", ColorHex = "#16A085", DisplayOrder = 4 },
                new() { NameAr = "أرز", NameEn = "Rice", IconName = "cube", ColorHex = "#F1C40F", DisplayOrder = 5 },
                new() { NameAr = "مكسرات", NameEn = "Nuts", IconName = "star", ColorHex = "#8E44AD", DisplayOrder = 6 },
                new() { NameAr = "زيوت", NameEn = "Oils", IconName = "drop", ColorHex = "#3498DB", DisplayOrder = 7 },
                new() { NameAr = "سكر وشاي", NameEn = "Sugar & Tea", IconName = "coffee", ColorHex = "#95A5A6", DisplayOrder = 8 },
                new() { NameAr = "منظفات", NameEn = "Cleaning", IconName = "sparkles", ColorHex = "#1ABC9C", DisplayOrder = 9 },
                new() { NameAr = "مشروبات", NameEn = "Beverages", IconName = "wine", ColorHex = "#E74C3C", DisplayOrder = 10 }
            };
            db.Categories.AddRange(cats);
            await db.SaveChangesAsync();

            var cEtarah = cats[0];
            var cBegol = cats[1];
            var cBoharat = cats[2];
            var cAashab = cats[3];
            var cRice = cats[4];
            var cNuts = cats[5];
            var cOils = cats[6];
            var cSugarTea = cats[7];
            var cClean = cats[8];
            var cBev = cats[9];

            // Seed Customers
            var customers = new List<Customer>
            {
                new() { FullName = "عميل نقدي", Phone = "0500000000", CreditBalance = 0, LoyaltyPoints = 0 },
                new() { FullName = "أحمد علي", Phone = "01023456789", CreditBalance = 250, LoyaltyPoints = 180, Notes = "عميل دائم وموثوق" },
                new() { FullName = "فاطمة محمد", Phone = "01198765432", CreditBalance = 0, LoyaltyPoints = 95 },
                new() { FullName = "مصطفى كامل", Phone = "01234567890", CreditBalance = 680, LoyaltyPoints = 50, Notes = "سداد شهري متأخر قليلاً" },
                new() { FullName = "سارة أحمد", Phone = "01587654321", CreditBalance = 1500, LoyaltyPoints = 350, Notes = "ديون متراكمة للمشتريات العائلية" },
                new() { FullName = "محمد حسام", Phone = "01009876543", CreditBalance = 0, LoyaltyPoints = 420 }
            };
            db.Customers.AddRange(customers);
            await db.SaveChangesAsync();

            var custCash = customers[0];
            var custAhmed = customers[1];
            var custFatma = customers[2];
            var custMostafa = customers[3];
            var custSara = customers[4];
            var custMohamed = customers[5];

            // Seed Products (55+ realistic products)
            var products = new List<Product>
            {
                // Category 1: عطارة (Weight)
                new() { Sku = "ETR-001", Barcode = "6221001001", NameAr = "كمون بلدي مطحون", NameEn = "Cumin Powder", CostPrice = 120m, SellPrice = 180m, TaxRate = 0, StockQty = 45.500m, MinStockQty = 5m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cEtarah.Id },
                new() { Sku = "ETR-002", Barcode = "6221001002", NameAr = "فلفل أسود حب", NameEn = "Black Pepper Whole", CostPrice = 140m, SellPrice = 210m, TaxRate = 0, StockQty = 30.250m, MinStockQty = 5m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cEtarah.Id },
                new() { Sku = "ETR-003", Barcode = "6221001003", NameAr = "كزبرة ناشفة مطحونة", NameEn = "Coriander Powder", CostPrice = 60m, SellPrice = 90m, TaxRate = 0, StockQty = 25m, MinStockQty = 5m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cEtarah.Id },
                new() { Sku = "ETR-004", Barcode = "6221001004", NameAr = "زنجبيل مطحون", NameEn = "Ginger Powder", CostPrice = 90m, SellPrice = 140m, TaxRate = 0, StockQty = 15.500m, MinStockQty = 5m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cEtarah.Id },
                new() { Sku = "ETR-005", Barcode = "6221001005", NameAr = "قرفة ناعمة", NameEn = "Cinnamon Powder", CostPrice = 100m, SellPrice = 150m, TaxRate = 0, StockQty = 18m, MinStockQty = 5m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cEtarah.Id },
                new() { Sku = "ETR-006", Barcode = "6221001006", NameAr = "شطة حارة مطحونة", NameEn = "Hot Chili Powder", CostPrice = 70m, SellPrice = 110m, TaxRate = 0, StockQty = 22.800m, MinStockQty = 5m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cEtarah.Id },
                new() { Sku = "ETR-007", Barcode = "6221001007", NameAr = "كركم ناعم", NameEn = "Turmeric Powder", CostPrice = 80m, SellPrice = 120m, TaxRate = 0, StockQty = 20m, MinStockQty = 5m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cEtarah.Id },
                new() { Sku = "ETR-008", Barcode = "6221001008", NameAr = "كاري هندي", NameEn = "Indian Curry Powder", CostPrice = 90m, SellPrice = 135m, TaxRate = 0, StockQty = 12.500m, MinStockQty = 5m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cEtarah.Id },
                new() { Sku = "ETR-009", Barcode = "6221001009", NameAr = "ورق لورا (غار)", NameEn = "Bay Leaves", CostPrice = 150m, SellPrice = 240m, TaxRate = 0, StockQty = 3.200m, MinStockQty = 10m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cEtarah.Id }, // Low stock
                new() { Sku = "ETR-010", Barcode = "6221001010", NameAr = "حبهان (هيل) كامل", NameEn = "Cardamom Green", CostPrice = 600m, SellPrice = 900m, TaxRate = 0, StockQty = 0.450m, MinStockQty = 2m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cEtarah.Id }, // Low stock

                // Category 2: بقوليات (Weight)
                new() { Sku = "BEG-001", Barcode = "6222001001", NameAr = "فول تدميس بلدي", NameEn = "Fava Beans", CostPrice = 30m, SellPrice = 42m, TaxRate = 0, StockQty = 150m, MinStockQty = 20m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cBegol.Id },
                new() { Sku = "BEG-002", Barcode = "6222001002", NameAr = "عدس أصفر مجروش", NameEn = "Yellow Lentils", CostPrice = 35m, SellPrice = 48m, TaxRate = 0, StockQty = 120m, MinStockQty = 20m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cBegol.Id },
                new() { Sku = "BEG-003", Barcode = "6222001003", NameAr = "عدس بجبة (بني)", NameEn = "Brown Lentils", CostPrice = 32m, SellPrice = 45m, TaxRate = 0, StockQty = 85m, MinStockQty = 15m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cBegol.Id },
                new() { Sku = "BEG-004", Barcode = "6222001004", NameAr = "حمص شام جامبو", NameEn = "Chickpeas Jumbo", CostPrice = 45m, SellPrice = 65m, TaxRate = 0, StockQty = 60m, MinStockQty = 10m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cBegol.Id },
                new() { Sku = "BEG-005", Barcode = "6222001005", NameAr = "فاصوليا بيضاء جافة", NameEn = "White Kidney Beans", CostPrice = 55m, SellPrice = 78m, TaxRate = 0, StockQty = 1.200m, MinStockQty = 10m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cBegol.Id }, // Low stock
                new() { Sku = "BEG-006", Barcode = "6222001006", NameAr = "لوبيا عين سوداء", NameEn = "Black Eyed Peas", CostPrice = 52m, SellPrice = 75m, TaxRate = 0, StockQty = 40m, MinStockQty = 10m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cBegol.Id },
                new() { Sku = "BEG-007", Barcode = "6222001007", NameAr = "ترمس حلو", NameEn = "Sweet Lupin", CostPrice = 25m, SellPrice = 38m, TaxRate = 0, StockQty = 50m, MinStockQty = 10m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cBegol.Id },
                new() { Sku = "BEG-008", Barcode = "6222001008", NameAr = "ذرة فيشار", NameEn = "Popcorn Corn", CostPrice = 28m, SellPrice = 40m, TaxRate = 0, StockQty = 65m, MinStockQty = 10m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cBegol.Id },

                // Category 3: بهارات (Weight)
                new() { Sku = "BOH-001", Barcode = "6223001001", NameAr = "بهارات لحمة مشكلة", NameEn = "Meat Spices Mix", CostPrice = 110m, SellPrice = 160m, TaxRate = 0, StockQty = 15m, MinStockQty = 3m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cBoharat.Id },
                new() { Sku = "BOH-002", Barcode = "6223001002", NameAr = "بهارات فراخ (دجاج)", NameEn = "Chicken Spices Mix", CostPrice = 110m, SellPrice = 160m, TaxRate = 0, StockQty = 18m, MinStockQty = 3m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cBoharat.Id },
                new() { Sku = "BOH-003", Barcode = "6223001003", NameAr = "بهارات حواوشي ممتازة", NameEn = "Hawawshi Spices", CostPrice = 120m, SellPrice = 180m, TaxRate = 0, StockQty = 10m, MinStockQty = 3m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cBoharat.Id },
                new() { Sku = "BOH-004", Barcode = "6223001004", NameAr = "السبع بهارات", NameEn = "Seven Spices Blends", CostPrice = 130m, SellPrice = 195m, TaxRate = 0, StockQty = 25m, MinStockQty = 5m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cBoharat.Id },
                new() { Sku = "BOH-005", Barcode = "6223001005", NameAr = "بهارات كبسة سعودي", NameEn = "Kabsa Spices Mix", CostPrice = 120m, SellPrice = 180m, TaxRate = 0, StockQty = 14m, MinStockQty = 3m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cBoharat.Id },

                // Category 4: أعشاب (Weight)
                new() { Sku = "AAS-001", Barcode = "6224001001", NameAr = "ينسون نجمي ممتاز", NameEn = "Star Anise", CostPrice = 160m, SellPrice = 240m, TaxRate = 0, StockQty = 8m, MinStockQty = 2m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cAashab.Id },
                new() { Sku = "AAS-002", Barcode = "6224001002", NameAr = "كركديه أسواني زهرة", NameEn = "Hibiscus Flowers", CostPrice = 90m, SellPrice = 140m, TaxRate = 0, StockQty = 40m, MinStockQty = 5m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cAashab.Id },
                new() { Sku = "AAS-003", Barcode = "6224001003", NameAr = "نعناع بلدي مجفف", NameEn = "Dried Mint", CostPrice = 50m, SellPrice = 80m, TaxRate = 0, StockQty = 15m, MinStockQty = 3m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cAashab.Id },
                new() { Sku = "AAS-004", Barcode = "6224001004", NameAr = "بابونج (شيح البابونج)", NameEn = "Chamomile", CostPrice = 180m, SellPrice = 270m, TaxRate = 0, StockQty = 10m, MinStockQty = 2m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cAashab.Id },
                new() { Sku = "AAS-005", Barcode = "6224001005", NameAr = "بردقوش مطحون", NameEn = "Marjoram Powder", CostPrice = 70m, SellPrice = 110m, TaxRate = 0, StockQty = 12m, MinStockQty = 2m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cAashab.Id },
                new() { Sku = "AAS-006", Barcode = "6224001006", NameAr = "تليو (زيرفون)", NameEn = "Linden Tea", CostPrice = 150m, SellPrice = 230m, TaxRate = 0, StockQty = 6m, MinStockQty = 2m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cAashab.Id },

                // Category 5: أرز (Piece & Weight)
                new() { Sku = "RIC-001", Barcode = "6225001001", NameAr = "أرز مصري فاخر 1كجم", NameEn = "Premium Egyptian Rice 1kg", CostPrice = 25m, SellPrice = 32m, TaxRate = 0, StockQty = 350m, MinStockQty = 50m, TrackStock = true, Unit = UnitType.Piece, CategoryId = cRice.Id },
                new() { Sku = "RIC-002", Barcode = "6225001002", NameAr = "أرز بسمتي ذهبي 1كجم", NameEn = "Golden Basmati Rice 1kg", CostPrice = 65m, SellPrice = 85m, TaxRate = 0, StockQty = 180m, MinStockQty = 30m, TrackStock = true, Unit = UnitType.Piece, CategoryId = cRice.Id },
                new() { Sku = "RIC-003", Barcode = "6225001003", NameAr = "أرز مصري معبأ 5كجم", NameEn = "Egyptian Rice 5kg bag", CostPrice = 120m, SellPrice = 150m, TaxRate = 0, StockQty = 60m, MinStockQty = 10m, TrackStock = true, Unit = UnitType.Piece, CategoryId = cRice.Id },
                new() { Sku = "RIC-004", Barcode = "6225001004", NameAr = "أرز بسمتي هندي جامبو", NameEn = "Jumbo Basmati Bulk", CostPrice = 70m, SellPrice = 95m, TaxRate = 0, StockQty = 200m, MinStockQty = 30m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cRice.Id },

                // Category 6: مكسرات (Weight)
                new() { Sku = "NUT-001", Barcode = "6226001001", NameAr = "لوز محمص مملح", NameEn = "Roasted Salted Almonds", CostPrice = 320m, SellPrice = 460m, TaxRate = 0, StockQty = 12.500m, MinStockQty = 3m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cNuts.Id },
                new() { Sku = "NUT-002", Barcode = "6226001002", NameAr = "كاجو جامبو محمص", NameEn = "Roasted Jumbo Cashew", CostPrice = 380m, SellPrice = 550m, TaxRate = 0, StockQty = 15m, MinStockQty = 3m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cNuts.Id },
                new() { Sku = "NUT-003", Barcode = "6226001003", NameAr = "فستق أمريكي مقشر", NameEn = "Pistachio Shelled", CostPrice = 550m, SellPrice = 800m, TaxRate = 0, StockQty = 8m, MinStockQty = 2m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cNuts.Id },
                new() { Sku = "NUT-004", Barcode = "6226001004", NameAr = "بندق محمص مقشر", NameEn = "Peeled Roasted Hazelnut", CostPrice = 340m, SellPrice = 490m, TaxRate = 0, StockQty = 10m, MinStockQty = 2m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cNuts.Id },
                new() { Sku = "NUT-005", Barcode = "6226001005", NameAr = "عين جمل مقشر", NameEn = "Shelled Walnuts", CostPrice = 290m, SellPrice = 420m, TaxRate = 0, StockQty = 14m, MinStockQty = 2m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cNuts.Id },
                new() { Sku = "NUT-006", Barcode = "6226001006", NameAr = "فول سوداني مملح", NameEn = "Salted Peanuts", CostPrice = 50m, SellPrice = 80m, TaxRate = 0, StockQty = 45m, MinStockQty = 5m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cNuts.Id },
                new() { Sku = "NUT-007", Barcode = "6226001007", NameAr = "لب سوبر مصري", NameEn = "Egyptian Super Seeds", CostPrice = 80m, SellPrice = 120m, TaxRate = 0, StockQty = 25m, MinStockQty = 5m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cNuts.Id },
                new() { Sku = "NUT-008", Barcode = "6226001008", NameAr = "لب عباد الشمس", NameEn = "Sunflower Seeds", CostPrice = 40m, SellPrice = 65m, TaxRate = 0, StockQty = 30m, MinStockQty = 5m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cNuts.Id },

                // Category 7: زيوت (Piece & Weight)
                new() { Sku = "OIL-001", Barcode = "6227001001", NameAr = "زيت عباد شمس 800مل", NameEn = "Sunflower Oil 800ml", CostPrice = 48m, SellPrice = 58m, TaxRate = 15, StockQty = 120m, MinStockQty = 15m, TrackStock = true, Unit = UnitType.Piece, CategoryId = cOils.Id },
                new() { Sku = "OIL-002", Barcode = "6227001002", NameAr = "زيت ذرة كريستال 1.6 لتر", NameEn = "Crystal Corn Oil 1.6L", CostPrice = 110m, SellPrice = 130m, TaxRate = 15, StockQty = 80m, MinStockQty = 10m, TrackStock = true, Unit = UnitType.Piece, CategoryId = cOils.Id },
                new() { Sku = "OIL-003", Barcode = "6227001003", NameAr = "زيت زيتون بكر ممتاز 500مل", NameEn = "Extra Virgin Olive Oil 500ml", CostPrice = 150m, SellPrice = 190m, TaxRate = 15, StockQty = 40m, MinStockQty = 5m, TrackStock = true, Unit = UnitType.Piece, CategoryId = cOils.Id },
                new() { Sku = "OIL-004", Barcode = "6227001004", NameAr = "زيت حار (كتان) بلدي", NameEn = "Flaxseed Oil Bulk", CostPrice = 60m, SellPrice = 90m, TaxRate = 0, StockQty = 50m, MinStockQty = 10m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cOils.Id },

                // Category 8: سكر وشاي (Piece & Weight)
                new() { Sku = "SUG-001", Barcode = "6228001001", NameAr = "سكر أبيض ناعم 1كجم", NameEn = "White Sugar 1kg Bag", CostPrice = 28m, SellPrice = 35m, TaxRate = 15, StockQty = 500m, MinStockQty = 100m, TrackStock = true, Unit = UnitType.Piece, CategoryId = cSugarTea.Id },
                new() { Sku = "SUG-002", Barcode = "6228001002", NameAr = "شاي العروسة 250جم", NameEn = "El-Aroosa Tea 250g", CostPrice = 45m, SellPrice = 55m, TaxRate = 15, StockQty = 150m, MinStockQty = 20m, TrackStock = true, Unit = UnitType.Piece, CategoryId = cSugarTea.Id },
                new() { Sku = "SUG-003", Barcode = "6228001003", NameAr = "شاي ليبتون 100 فتلة", NameEn = "Lipton Tea 100 Envelopes", CostPrice = 60m, SellPrice = 75m, TaxRate = 15, StockQty = 90m, MinStockQty = 15m, TrackStock = true, Unit = UnitType.Piece, CategoryId = cSugarTea.Id },
                new() { Sku = "SUG-004", Barcode = "6228001004", NameAr = "بن محوج برازيلي وسط", NameEn = "Brazilian Spice Coffee Mid", CostPrice = 240m, SellPrice = 350m, TaxRate = 15, StockQty = 15m, MinStockQty = 3m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cSugarTea.Id },
                new() { Sku = "SUG-005", Barcode = "6228001005", NameAr = "بن ساده فاتح ممتاز", NameEn = "Plain Coffee Light", CostPrice = 200m, SellPrice = 300m, TaxRate = 15, StockQty = 0m, MinStockQty = 5m, TrackStock = true, Unit = UnitType.Weight, CategoryId = cSugarTea.Id }, // Out of stock

                // Category 9: منظفات (Piece)
                new() { Sku = "CLE-001", Barcode = "6229001001", NameAr = "مسحوق غسيل أريال 2.5كجم", NameEn = "Ariel Powder 2.5kg", CostPrice = 180m, SellPrice = 215m, TaxRate = 15, StockQty = 50m, MinStockQty = 5m, TrackStock = true, Unit = UnitType.Piece, CategoryId = cClean.Id },
                new() { Sku = "CLE-002", Barcode = "6229001002", NameAr = "سائل أطباق بريل 1 لتر", NameEn = "Pril Dishwashing Liquid 1L", CostPrice = 25m, SellPrice = 32m, TaxRate = 15, StockQty = 75m, MinStockQty = 10m, TrackStock = true, Unit = UnitType.Piece, CategoryId = cClean.Id },
                new() { Sku = "CLE-003", Barcode = "6229001003", NameAr = "كلور أبيض 1 لتر للاستخدام", NameEn = "White Bleach Chlorine 1L", CostPrice = 8m, SellPrice = 12m, TaxRate = 15, StockQty = 100m, MinStockQty = 15m, TrackStock = true, Unit = UnitType.Piece, CategoryId = cClean.Id },
                new() { Sku = "CLE-004", Barcode = "6229001004", NameAr = "ديتول مطهر منزلي 500مل", NameEn = "Dettol Antiseptic 500ml", CostPrice = 85m, SellPrice = 105m, TaxRate = 15, StockQty = 40m, MinStockQty = 5m, TrackStock = true, Unit = UnitType.Piece, CategoryId = cClean.Id },

                // Category 10: مشروبات (Piece)
                new() { Sku = "BEV-001", Barcode = "6220001001", NameAr = "مياه معدنية طبيعية 1.5 لتر", NameEn = "Mineral Water 1.5L", CostPrice = 3.5m, SellPrice = 5m, TaxRate = 15, StockQty = 400m, MinStockQty = 50m, TrackStock = true, Unit = UnitType.Piece, ExpirationDate = DateTime.UtcNow.AddDays(15), CategoryId = cBev.Id }, // Expiring soon
                new() { Sku = "BEV-002", Barcode = "6220001002", NameAr = "بيبسي زجاجة 1 لتر", NameEn = "Pepsi Plastic 1L", CostPrice = 12m, SellPrice = 15m, TaxRate = 15, StockQty = 120m, MinStockQty = 20m, TrackStock = true, Unit = UnitType.Piece, CategoryId = cBev.Id },
                new() { Sku = "BEV-003", Barcode = "6220001003", NameAr = "عصير جهينة مانجو طازج 1لتر", NameEn = "Juhayna Mango Juice 1L", CostPrice = 18m, SellPrice = 24m, TaxRate = 15, StockQty = 90m, MinStockQty = 15m, TrackStock = true, Unit = UnitType.Piece, ExpirationDate = DateTime.UtcNow.AddDays(25), CategoryId = cBev.Id } // Expiring soon
            };
            db.Products.AddRange(products);
            await db.SaveChangesAsync();

            // 3. Seed dynamic and beautiful historical sales over the last 7 days!
            var rnd = new Random(55);
            var now = DateTime.UtcNow;

            for (int i = 6; i >= 0; i--)
            {
                var saleDate = now.AddDays(-i).Date.AddHours(rnd.Next(9, 21)).AddMinutes(rnd.Next(0, 59));
                
                // Let's create 3 to 6 sales per day
                int numSalesThisDay = rnd.Next(3, 7);
                for (int s = 0; s < numSalesThisDay; s++)
                {
                    // Pick customer (Ahmed, Fatma, Mostafa, Sara, or Cash)
                    var cust = rnd.Next(0, 5) switch
                    {
                        0 => custAhmed,
                        1 => custFatma,
                        2 => custMostafa,
                        3 => custSara,
                        _ => custCash
                    };

                    var pMethod = cust.Id == custCash.Id ? (rnd.Next(0, 2) == 0 ? PaymentMethod.Cash : PaymentMethod.Card) : PaymentMethod.Credit;

                    var saleProducts = products.OrderBy(p => rnd.Next()).Take(rnd.Next(1, 6)).ToList();

                    var saleItems = new List<SaleItem>();
                    decimal subTotal = 0;
                    decimal taxAmount = 0;

                    foreach (var p in saleProducts)
                    {
                        // Calculate weight vs piece quantities
                        decimal qty = p.Unit == UnitType.Weight ? (decimal)Math.Round(rnd.NextDouble() * 2.0 + 0.1, 3) : rnd.Next(1, 5);
                        
                        // Prevent selling out of stock completely, adjust stock
                        if (p.StockQty >= qty)
                        {
                            p.StockQty -= qty;
                        }
                        else
                        {
                            qty = Math.Max(0.1m, p.StockQty);
                            p.StockQty = 0;
                        }

                        if (qty <= 0) continue;

                        decimal lineSub = qty * p.SellPrice;
                        decimal lineTax = lineSub * (p.TaxRate / 100m);

                        saleItems.Add(new SaleItem
                        {
                            ProductId = p.Id,
                            ProductNameSnapshot = p.NameAr,
                            Quantity = qty,
                            UnitPrice = p.SellPrice,
                            DiscountAmount = 0,
                            TaxRate = p.TaxRate,
                            LineTotal = lineSub + lineTax
                        });

                        subTotal += lineSub;
                        taxAmount += lineTax;

                        // Create InventoryMovement for the sale
                        db.InventoryMovements.Add(new InventoryMovement
                        {
                            ProductId = p.Id,
                            Type = MovementType.Sale,
                            Quantity = -qty,
                            QuantityBefore = p.StockQty + qty,
                            QuantityAfter = p.StockQty,
                            UnitCost = p.CostPrice,
                            Reference = $"INV-{saleDate:yyyyMMddHHmmss}",
                            Reason = "مبيعات نقطة البيع",
                            UserId = cashierUser.Id,
                            CreatedAt = saleDate
                        });
                    }

                    if (saleItems.Count == 0) continue;

                    decimal total = subTotal + taxAmount;
                    decimal paid = pMethod == PaymentMethod.Credit ? 0 : total;
                    decimal change = pMethod == PaymentMethod.Credit ? 0 : 0;

                    if (pMethod == PaymentMethod.Cash && rnd.Next(0, 2) == 0)
                    {
                        paid = Math.Ceiling(total / 10m) * 10m;
                        change = paid - total;
                    }

                    var invoiceNo = $"INV-{saleDate:yyyyMMdd}-{rnd.Next(1000, 9999)}";

                    var saleObj = new Sale
                    {
                        InvoiceNumber = invoiceNo,
                        SaleDate = saleDate,
                        SubTotal = subTotal,
                        DiscountAmount = 0,
                        TaxAmount = taxAmount,
                        Total = total,
                        PaidAmount = paid,
                        ChangeAmount = change,
                        PaymentMethod = pMethod,
                        CustomerId = cust.Id,
                        CashierId = cashierUser.Id,
                        Items = saleItems,
                        CreatedAt = saleDate
                    };

                    db.Sales.Add(saleObj);

                    // Adjust customer CreditBalance if payment method was Credit
                    if (pMethod == PaymentMethod.Credit)
                    {
                        cust.CreditBalance += total;
                        cust.LoyaltyPoints += Math.Floor(total * 0.1m); // 10% points
                    }
                    else if (cust.Id != custCash.Id)
                    {
                        cust.LoyaltyPoints += Math.Floor(total * 0.1m);
                    }
                }
            }

            await db.SaveChangesAsync();
        }
    }
}

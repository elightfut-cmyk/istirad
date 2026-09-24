// ثوابت الـ API (المفاتيح والروابط)
const RAPIDAPI_KEY = "70ce2ef3e8mshc1e2d39c2a3d623p166ef2jsnf91121818898";

// 1. دالة البحث بالصورة (الخطوة الأولى)
async function getProductUrlFromImage(imageUrl) {
    // لاحظ تغيير المسار إلى alibaba بدلاً من aliexpress
    const url = "https://alibaba-1688-ecom-china-lens-search-api.p.rapidapi.com/search/alibaba";
    
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-rapidapi-host': 'alibaba-1688-ecom-china-lens-search-api.p.rapidapi.com',
            'x-rapidapi-key': RAPIDAPI_KEY
        },
        body: JSON.stringify({ imageUrl: imageUrl })
    };

    try {
        console.log("جاري البحث بالصورة لاستخراج رابط المنتج...");
        const response = await fetch(url, options);
        const data = await response.json();
        
        console.log("Response Type:", typeof data, Array.isArray(data));
        // console.log("Response Data:", JSON.stringify(data).substring(0, 200));

        if (Array.isArray(data) && data.length > 0) {
            const firstProduct = data[0]; 
            console.log("نجح البحث بالصورة! تم العثور على المنتج ورابطه هو:", firstProduct.productUrl);
            return firstProduct.productUrl;
        } else if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
            const firstProduct = data.data[0];
            console.log("نجح البحث بالصورة! تم العثور على المنتج ورابطه هو:", firstProduct.productUrl);
            return firstProduct.productUrl;
        } else {
            console.error("Unrecognized data format:", data);
            throw new Error("لم يتم العثور على منتجات مشابهة للصورة.");
        }
    } catch (error) {
        console.error("خطأ في البحث بالصورة:", error);
        return null;
    }
}

// 2. دالة جلب تفاصيل المنتج الكاملة (الخطوة الثانية)
async function getFullProductDetails(productUrl) {
    // نقوم بتشفير الرابط (encodeURIComponent) لتجنب الأخطاء في عنوان الـ URL
    const encodedUrl = encodeURIComponent(productUrl);
    const url = `https://alibaba-api2.p.rapidapi.com/alibaba/product-details?url=${encodedUrl}`; 
    
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-host': 'alibaba-api2.p.rapidapi.com',
            'x-rapidapi-key': RAPIDAPI_KEY
        }
    };

    try {
        console.log("جاري جلب التفاصيل الدقيقة للمنتج من الرابط...");
        const response = await fetch(url, options);
        const productDetails = await response.json();
        
        console.log("نجح جلب التفاصيل الدقيقة للمنتج!");
        return productDetails;
    } catch (error) {
        console.error("خطأ في جلب تفاصيل المنتج:", error);
        return null;
    }
}

// 3. الدالة الرئيسية
async function runTest() {
    const testImage = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400";
    
    const pUrl = await getProductUrlFromImage(testImage);
    
    if (pUrl) {
        const exactDetails = await getFullProductDetails(pUrl);
        console.log("البيانات النهائية الجاهزة للعرض:", exactDetails);
    }
}

// تشغيل الاختبار
runTest();

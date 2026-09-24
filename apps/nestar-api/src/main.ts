import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './libs/interceptor/Logging.interceptor';
import { graphqlUploadExpress } from 'graphql-upload';
import * as express from 'express';
// WsAdapter — @nestjs/platform-ws paketidan, 'ws' kutubxonasi bilan ishlash uchun maxsus adapter (BUGUN QO'SHILDI)
import { WsAdapter } from '@nestjs/platform-ws';

// bootstrap — ilovani ishga tushiruvchi asosiy async funksiya
async function bootstrap() {
	// AppModule asosida NestJS ilovasi yaratiladi, natija kutiladi
	const app = await NestFactory.create(AppModule);
	// global validatsiya yoqiladi — har bir kiruvchi DTO avtomatik tekshiriladi
	app.useGlobalPipes(new ValidationPipe());
	// global interceptor yoqiladi — har bir so'rov/javob logga yoziladi
	app.useGlobalInterceptors(new LoggingInterceptor());
	// CORS yoqiladi — boshqa domendan kelgan so'rovlarga ruxsat, credentials: true — cookie/token yuborish uchun
	app.enableCors({ origin: true, credentials: true });

	// fayl yuklash middleware'i — maksimal 15MB, 10 tagacha fayl
	app.use(graphqlUploadExpress({ maxFileSize: 15000000, maxFiles: 10 }));
	// /uploads yo'li orqali yuklangan rasmlarni statik fayl sifatida tarqatish
	app.use('/uploads', express.static('./uploads'));

	// BUGUN QO'SHILDI: NestJS standart holatda socket.io kutadi, lekin biz 'ws' ishlatamiz, shuning uchun mos adapter o'rnatiladi; new WsAdapter(app) — adapter klassidan yangi instansiya, argument sifatida app obyekti beriladi
	app.useWebSocketAdapter(new WsAdapter(app));
	// server PORT_API portida tinglaydi; ?? — nullish coalescing, agar .env'da yo'q bo'lsa 3000 ishlatiladi
	await app.listen(process.env.PORT_API ?? 3000);
}
// funksiya chaqiriladi, ilova ishga tushadi
bootstrap();

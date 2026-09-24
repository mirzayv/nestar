// NestFactory — NestJS ilovasini yaratish uchun asosiy klass
import { NestFactory } from '@nestjs/core';
// DIQQAT: bu yerda AppModule EMAS, balki NestarBatchModule — bu ikkala ilova haqiqatan mustaqil ekanining eng aniq isboti: har birining o'z kirish nuqtasi va o'z ildiz moduli bor
import { NestarBatchModule } from './nestar-batch.module';
import { ValidationPipe } from '@nestjs/common';
// LoggingInterceptor nestar-api'dan import qilinyapti — kod takrorlanmasligi uchun (monorepo imkoniyati)
import { LoggingInterceptor } from 'apps/nestar-api/src/libs/interceptor/Logging.interceptor';

// bootstrap — ilovani ishga tushiruvchi asosiy async funksiya
async function bootstrap() {
	// NestarBatchModule asosida yangi, mustaqil ilova yaratiladi
	const app = await NestFactory.create(NestarBatchModule);
	// global validatsiya yoqiladi
	app.useGlobalPipes(new ValidationPipe());
	// global logging interceptor yoqiladi
	app.useGlobalInterceptors(new LoggingInterceptor());

	// server PORT_BATCH portida tinglaydi; ?? — nullish coalescing operatori: agar PORT_BATCH .env'da yo'q bo'lsa 3000 ishlatiladi; sizning .env'ingizda PORT_BATCH=3008, PORT_API=3007 — bu MAJBURIY, chunki ikkita server bir portda ishlay olmaydi
	await app.listen(process.env.PORT_BATCH ?? 3000);

	// qaysi portda ishlayotgani konsolga chiqariladi (tekshirish uchun)
	console.log('PORT_BATCH:', process.env.PORT_BATCH);
}

// funksiya chaqiriladi, ilova ishga tushadi
bootstrap();

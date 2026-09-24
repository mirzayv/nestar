// Module decorator-funksiyasi
import { Module } from '@nestjs/common';
// InjectConnection — decorator, haqiqiy Mongoose ulanish obyektini in'ektsiya qilish uchun; MongooseModule — MongoDB bilan ishlash moduli
import { InjectConnection, MongooseModule } from '@nestjs/mongoose';
// Connection — Mongoose ulanish obyektining tipi
import { Connection } from 'mongoose';

@Module({
	imports: [
		// forRootAsync — MongoDB ulanishini "keyinchalik", useFactory funksiyasi orqali dinamik sozlaydi; Async qo'shimchasi kerak, chunki .env fayli o'qilguncha kutish lozim
		MongooseModule.forRootAsync({
			// useFactory — parametri yo'q arrow function, obyekt qaytaradi; ({...}) — qavs ichidagi jingalak qavs, aks holda JS uni funksiya tanasi deb o'ylaydi
			useFactory: () => ({
				// ternary operator: agar NODE_ENV 'production' bo'lsa MONGO_PROD, aks holda MONGO_DEV ulanish satri ishlatiladi
				uri: process.env.NODE_ENV === 'production' ? process.env.MONGO_PROD : process.env.MONGO_DEV,
			}),
		}),
	],
	// MongooseModule tashqariga eksport qilinadi, shunda NestarBatchModule shu ulanishdan foydalana oladi
	exports: [MongooseModule],
})
export class DatabaseModule {
	// constructor — @InjectConnection() orqali haqiqiy Mongoose ulanish obyekti in'ektsiya qilinib, connection nomli private readonly propertyga saqlanadi
	constructor(@InjectConnection() private readonly connection: Connection) {
		// readyState === 1 — Mongoose'da "connected" (ulangan) holatini bildiruvchi raqam
		if (connection.readyState === 1) {
			// muvaffaqiyatli ulanish haqida konsolga log, ichida yana bir ternary orqali muhit nomi qo'shiladi
			console.log(
				`MongoDB is connected into ${process.env.NODE_ENV === 'production' ? 'production' : 'development'} db`,
			);
		} else {
			// aks holda xato haqida log — bu sof diagnostika kodi, ilova mantig'iga ta'sir qilmaydi
			console.log('DB is not connected!');
		}
	}
}

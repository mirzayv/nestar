import { Module } from '@nestjs/common';
// Controller va Service qo'shni fayllardan import qilinyapti
import { NestarBatchController } from './nestar-batch.controller';
import { NestarBatchService } from './nestar-batch.service';
// .env faylini o'qish uchun modul
import { ConfigModule } from '@nestjs/config';
// yuqorida yozgan MongoDB ulanish modulimiz
import { DatabaseModule } from './database/database.module';
// ScheduleModule — @nestjs/schedule paketidan, cron vazifalarini boshqaradigan asosiy modul (BUGUNGI DARSNING KALITI)
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
// DIQQAT: schema fayllari BOSHQA ILOVADAN (nestar-api) to'g'ridan-to'g'ri import qilinyapti — bu mumkin, chunki bu MONOREPO: ikkala ilova bir xil tsconfig va node_modules'ni bo'lishadi
import PropertySchema from 'apps/nestar-api/src/schemas/Property.model';
import MemberSchema from 'apps/nestar-api/src/schemas/Member.model';

@Module({
	imports: [
		// .env o'qiladi
		ConfigModule.forRoot(),
		// MongoDB ulanishi
		DatabaseModule,
		// ScheduleModule.forRoot() — cron mexanizmini ishga tushiradi; agar bu qatorni unutsangiz, @Cron metodlaringiz HECH QACHON chaqirilmaydi va hech qanday xato ham chiqmaydi (juda chalg'ituvchi bug)
		ScheduleModule.forRoot(),
		// Property modeli ro'yxatga olinadi — batch server mulklar reytingini hisoblaydi
		MongooseModule.forFeature([{ name: 'Property', schema: PropertySchema }]),
		// Member modeli ro'yxatga olinadi — batch server agentlar reytingini ham hisoblaydi
		MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }]),
	],
	// Controller ro'yxatga olinadi (cron vazifalari shu yerda)
	controllers: [NestarBatchController],
	// Service ro'yxatga olinadi (haqiqiy hisob-kitob shu yerda)
	providers: [NestarBatchService],
})
export class NestarBatchModule {}

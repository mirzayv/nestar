// Controller — decorator, Get — HTTP GET so'rovi uchun decorator, Logger — log yozish klassi
import { Controller, Get, Logger } from '@nestjs/common';
// Cron decorator — @nestjs/schedule paketidan, metodni jadval bo'yicha avtomatik ishga tushadigan vazifaga aylantiradi
import { Cron } from '@nestjs/schedule';
import { NestarBatchService } from './nestar-batch.service';
// uchta konstanta lib/config.ts fayldan import qilinyapti
import { BATCH_ROLLBACK, BATCH_TOP_PROPERTIES, BATCH_TOP_AGENTS } from './lib/config';

// @Controller() — argumentsiz, ya'ni bu controller ildiz yo'lda ("/") ishlaydi
@Controller()
export class NestarBatchController {
	// logger — private property, Logger instansiyasi, nomi 'BatchController'
	private logger: Logger = new Logger('BatchController');

	// constructor orqali NestarBatchService in'ektsiya qilinadi (private readonly — faqat shu class ichida, o'zgartirib bo'lmaydi)
	constructor(private readonly nestarBatchService: NestarBatchService) {}

	// Har kuni 01:00:00 da ishlaydi
	// @Cron ifodasi olti qismdan: soniya daqiqa soat oyning-kuni oy haftaning-kuni; '0 0 1 * * *' = soniya:0, daqiqa:0, soat:1, qolgani * (istalgan) → har kuni soat 01:00:00; ikkinchi argument { name: ... } vazifaga nom beradi (keyinroq kod orqali topish/to'xtatish uchun)
	@Cron('0 0 1 * * *', { name: BATCH_ROLLBACK })
	// batchRollback — hech qanday parametr olmaydi, siz uni qo'lda chaqirmaysiz, NestJS jadval bo'yicha o'zi chaqiradi
	public async batchRollback() {
		// try/catch — MAJBURIY amaliyot cron vazifalarida: agar xato ushlanmasa, butun batch server qulashi mumkin, va bu tunda, hech kim ko'rmaydigan paytda sodir bo'ladi
		try {
			// Logger obyektining ichki 'context' maydoni qo'lda o'zgartiriladi (kvadrat qavs orqali, chunki bu maydon rasmiy API'da ochiq emas); natijada konsolda loglar [BATCH_ROLLBACK] prefiksi bilan chiqadi
			this.logger['context'] = BATCH_ROLLBACK;
			// debug darajasida log — vazifa boshlanganini qayd etadi
			this.logger.debug('EXECUTED!');

			// haqiqiy ish Service'ga topshiriladi — "yupqa Controller, qalin Service" tamoyili
			await this.nestarBatchService.batchRollback();
		} catch (error) {
			// xato bo'lsa, logger orqali yoziladi, lekin server ishlashda davom etadi
			this.logger.error(error);
		}
	}

	// Har kuni 01:00:20 da ishlaydi — 20 soniyalik kechikish TASODIFIY EMAS: batchRollback avval reytinglarni 0ga tushirishi kerak, chunki bu metod aynan rank:0 shartiga qarab ishlaydi
	@Cron('20 0 1 * * *', { name: BATCH_TOP_PROPERTIES })
	public async batchTopProperties() {
		try {
			this.logger['context'] = BATCH_TOP_PROPERTIES;
			this.logger.debug('EXECUTED!');

			await this.nestarBatchService.batchTopProperties();
		} catch (error) {
			this.logger.error(error);
		}
	}

	// Har kuni 01:00:40 da ishlaydi — uchinchi navbatda
	@Cron('40 0 1 * * *', { name: BATCH_TOP_AGENTS })
	public async batchTopAgents() {
		try {
			this.logger['context'] = BATCH_TOP_AGENTS;
			this.logger.debug('EXECUTED!');

			await this.nestarBatchService.batchTopAgents();
		} catch (error) {
			this.logger.error(error);
		}
	}

	// @Get() — oddiy HTTP GET so'rovi, brauzerda http://localhost:3008 ochilganda ishlaydi
	@Get()
	// getHello — oddiy salom xabari qaytaradi, batch server ishlab turganini tekshirish uchun
	getHello(): string {
		return this.nestarBatchService.getHello();
	}
}

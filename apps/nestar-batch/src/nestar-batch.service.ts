// Injectable decorator — classni dependency injection uchun tayyorlaydi
import { Injectable } from '@nestjs/common';
// InjectModel decorator — Mongoose modelini constructor'ga in'ektsiya qilish uchun
import { InjectModel } from '@nestjs/mongoose';
// Member va Property DTO'lari nestar-api'dan to'g'ridan-to'g'ri import qilinyapti (monorepo imkoniyati)
import { Member } from 'apps/nestar-api/src/libs/dto/member/member';
import { Property } from 'apps/nestar-api/src/libs/dto/property/property';
// MemberStatus, MemberType enum'lari — a'zoning holati va turi
import { MemberStatus, MemberType } from 'apps/nestar-api/src/libs/enums/member.enum';
// PropertyStatus enum'i — mulkning holati
import { PropertyStatus } from 'apps/nestar-api/src/libs/enums/property.enum';
// Model — Mongoose modelining umumiy tipi
import { Model } from 'mongoose';

@Injectable()
export class NestarBatchService {
	constructor(
		// 'Property' modeli in'ektsiya qilinadi, tipi Model<Property>
		@InjectModel('Property') private readonly propertyModel: Model<Property>,
		// 'Member' modeli in'ektsiya qilinadi, tipi Model<Member>
		@InjectModel('Member') private readonly memberModel: Model<Member>,
	) {}

	// batchRollback — parametr olmaydi, Promise<void> qaytaradi (void = "bo'shliq", hech qanday qiymat qaytarmaydi, faqat amal bajaradi)
	public async batchRollback(): Promise<void> {
		// updateMany — ikkita argument oladi: birinchisi FILTR (qaysi hujjatlar), ikkinchisi YANGILANISH (nima o'zgaradi); findOneAndUpdate'dan farqi — barcha mos hujjatlarni BIR VAQTDA yangilaydi
		await this.propertyModel
			.updateMany(
				{
					// filtr: faqat faol mulklar
					propertyStatus: PropertyStatus.ACTIVE,
				},
				// yangilanish: propertyRank maydonini 0ga tushirish — bu "belgilash tizimi": 0 degani "hali hisoblanmagan, navbatda"
				{ propertyRank: 0 },
			)
			.exec();
		// xuddi shunday, barcha faol AGENT turidagi a'zolarning reytingi 0ga tushiriladi
		await this.memberModel
			.updateMany({ memberStatus: MemberStatus.ACTIVE, memberType: MemberType.AGENT }, { memberRank: 0 })
			.exec();
		// konsolga tasdiqlash log'i
		console.log('batchRollback');
	}

	// batchTopProperties — mulklar reytingini hisoblaydi
	public async batchTopProperties(): Promise<void> {
		// barcha faol VA hali hisoblanmagan (propertyRank: 0) mulklar topiladi, natija Property[] tipidagi massivga saqlanadi
		const properties: Property[] = await this.propertyModel
			.find({ propertyStatus: PropertyStatus.ACTIVE, propertyRank: 0 })
			.exec();
		// .map() har bir mulk uchun async funksiya chaqiradi; async funksiya HAR DOIM Promise qaytaradi, demak promisedList — bu natijalar massivi EMAS, balki PROMISE'LAR massivi (har biri "yangilashni boshladim, hali tugatmadim" degan va'da)
		const promisedList = properties.map(async (ele: Property) => {
			// destructuring — hujjatdan uchta kerakli maydon ajratib olinadi
			const { _id, propertyLikes, propertyViews } = ele;
			// BIZNES FORMULASI: like 2 barobar og'irroq, chunki like — ongli harakat (odam yoqtirib bosgan), view esa passiv (shunchaki ko'rgan, balki tasodifan)
			const rank = propertyLikes * 2 + propertyViews * 1;
			// shu mulkning propertyRank maydoni yangi hisoblangan qiymat bilan yangilanadi
			return await this.propertyModel.findByIdAndUpdate(_id, {
				propertyRank: rank,
			});
		});
		// Promise.all — barcha Promise'larni BIR VAQTDA, PARALLEL kutadi; agar for sikli ichida await yozganingizda 100 ta mulk ketma-ket (~1 soniya) yangilanardi, bu yerda esa hammasi birga (~10-50ms)
		await Promise.all(promisedList);
	}

	// batchTopAgents — agentlar reytingini hisoblaydi, batchTopProperties'ning aynan bir xil naqshi
	public async batchTopAgents(): Promise<void> {
		// barcha AGENT turidagi, hali hisoblanmagan a'zolar topiladi
		const agents: Member[] = await this.memberModel.find({ memberType: MemberType.AGENT, memberRank: 0 }).exec();
		const promisedList = agents.map(async (ele: Member) => {
			// destructuring — beshta maydon ajratib olinadi
			const { _id, memberProperties, memberLikes, memberArticles, memberViews } = ele;
			// BIZNES FORMULASI, boyroq: mulk joylash (5x) eng qimmatli hissa — platformaning asosiy mazmuni; maqola yozish (3x) — jamiyatga hissa; like olish (2x) va ko'rilish (1x) — passivroq ko'rsatkichlar
			const rank = memberProperties * 5 + memberArticles * 3 + memberLikes * 2 + memberViews * 1;
			// shu a'zoning memberRank maydoni yangilanadi
			return await this.memberModel.findByIdAndUpdate(_id, {
				memberRank: rank,
			});
		});
		// yana parallel kutish
		await Promise.all(promisedList);
	}

	// oddiy salom metodi, Controller'dagi @Get() orqali chaqiriladi
	public getHello(): string {
		return 'Welcome to Nestar BATCH Server';
	}
}

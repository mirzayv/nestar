// NestJS'ning Injectable decorator'i import qilinyapti — classni dependency injection uchun tayyorlaydi
import { Injectable } from '@nestjs/common';
// InjectModel decorator-funksiyasi — Mongoose modelini constructor'ga in'ektsiya qilish uchun ishlatiladi
import { InjectModel } from '@nestjs/mongoose';
// mongoose paketidan Model (umumiy model tipi) va ObjectId (MongoDB ID tipi) import qilinyapti
import { Model, ObjectId } from 'mongoose';
// View — ko'rish hujjatining to'liq DTO'si
import { View } from '../../libs/dto/view/view';
// ViewInput — yangi ko'rish yozuvi yaratish uchun kirish DTO'si
import { ViewInput } from '../../libs/dto/view/view.input';
// T — umumiy "har qanday obyekt" tipi
import { T } from '../../libs/types/common';
// OrdinaryInquiry — faqat page/limit maydonlaridan iborat oddiy so'rov DTO'si
import { OrdinaryInquiry } from '../../libs/dto/property/property.input';
// ViewGroup — ko'rish qaysi turdagi elementga tegishli ekanini bildiruvchi enum (masalan PROPERTY, MEMBER, ARTICLE)
import { ViewGroup } from '../../libs/enums/view.enum';
// lookupVisit — config.ts'da yozilgan, ko'rilgan mulk egasining ma'lumotini olish uchun tayyor $lookup obyekti
import { lookupVisit } from '../../libs/config';
// Properties — mulklar ro'yxati (list) va umumiy son (metaCounter) DTO'si
import { Properties } from '../../libs/dto/property/property';

// @Injectable() decorator — bu classni NestJS'ning dependency injection tizimiga ro'yxatdan o'tkazadi
@Injectable()
// ViewService klassi export qilinyapti
export class ViewService {
	// constructor — klass instansiyalanganda avtomatik chaqiriladi
	constructor(
		// @InjectModel('View') orqali MongoDB'dagi 'View' modeli in'ektsiya qilinadi, 'viewModel' nomli private, readonly propertyga saqlanadi
		@InjectModel('View') private readonly viewModel: Model<View>,
	) {}

	// recordView — bitta ViewInput parametrini oladi, Promise<View | null> qaytaradi (View topilsa yoziladi, aks holda null)
	public async recordView(input: ViewInput): Promise<View | null> {
		// avval shu ko'rish avval qayd qilinganmi tekshiriladi, natija await orqali kutiladi
		const viewExist = await this.checkViewExistence(input);
		// agar mavjud bo'lmasa
		if (!viewExist) {
			// konsolga xabar chiqariladi
			console.log('-- New View Insert --');
			// yangi ko'rish hujjati yaratiladi va qaytariladi
			return await this.viewModel.create(input);
			// agar mavjud bo'lsa
		} else return null; // null qaytariladi — bu "yangi view emas" degani, chaqiruvchi tomon buni "hisoblama" deb tushunadi
	}

	// checkViewExistence — private metod, faqat shu klass ichida ishlatiladi, ViewInput oladi, Promise<View | null> qaytaradi
	private async checkViewExistence(input: ViewInput): Promise<View | null> {
		// input obyektidan memberId va viewRefId destructuring orqali ajratib olinadi
		const { memberId, viewRefId } = input;
		// qidiruv sharti tayyorlanadi
		const search: T = { memberId: memberId, viewRefId: viewRefId };
		// bazadan mos hujjat qidiriladi va qaytariladi
		return await this.viewModel.findOne(search).exec();
	}

	// getVisitedProperties — [128]-darsning ikkinchi asosiy metodi: memberId va OrdinaryInquiry parametrlarini oladi, Promise<Properties> qaytaradi
	public async getVisitedProperties(memberId: ObjectId, input: OrdinaryInquiry): Promise<Properties> {
		// input obyektidan page va limit ajratib olinadi
		const { page, limit } = input;
		// match obyekti tayyorlanadi — faqat 'property' turidagi, faqat shu foydalanuvchining ko'rishlari
		const match: T = { viewGroup: ViewGroup.PROPERTY, memberId: memberId };

		// data konstantasiga aggregation natijasi await orqali kutib olinadi
		const data: T = await this.viewModel
			// aggregate metodi chaqiriladi, bosqichlar massivi uzatiladi
			.aggregate([
				// birinchi bosqich — filtrlash
				{ $match: match },
				// ikkinchi bosqich — eng yangi ko'rishlar birinchi chiqadigan tartibda saralash
				{ $sort: { updatedAt: -1 } },
				{
					// uchinchi bosqich — oddiy $lookup, mulk hujjatini topish uchun
					$lookup: {
						// 'properties' collection'idan qidiriladi
						from: 'properties',
						// view hujjatining 'viewRefId' maydoni orqali
						localField: 'viewRefId',
						// mulk hujjatining '_id' maydoni bilan solishtiriladi
						foreignField: '_id',
						// natija 'visitedProperty' nomi ostida qo'shiladi
						as: 'visitedProperty',
					},
				},
				// to'rtinchi bosqich — $lookup natijasi massiv bo'lgani uchun, uni yozib, oddiy obyektga aylantiradi
				{ $unwind: '$visitedProperty' },
				{
					// beshinchi bosqich — bitta oqimni ikkiga bo'ladi
					$facet: {
						// list qismi — sahifalangan ro'yxat
						list: [
							// nechta hujjat tashlab o'tiladi (sahifalash uchun)
							{ $skip: (page - 1) * limit },
							// nechta hujjat olinadi
							{ $limit: limit },
							// mulk egasining ma'lumotini qo'shadigan tayyor $lookup obyekti
							lookupVisit,
							// ichki 'visitedProperty.memberData' massivini oddiy obyektga aylantiradi
							{ $unwind: '$visitedProperty.memberData' },
						],
						// metaCounter qismi — filtrlangan umumiy son
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			// .exec() — so'rovni haqiqatan bazaga yuboradi
			.exec();

		// bo'sh Properties obyekti tayyorlanadi, metaCounter to'g'ridan-to'g'ri ko'chiriladi
		const result: Properties = { list: [], metaCounter: data[0].metaCounter };
		// data[0].list massividagi har bir elementdan faqat 'visitedProperty' qismi ajratib olinadi (map metodi orqali)
		result.list = data[0].list.map((ele: T) => ele.visitedProperty);

		// tayyor natija qaytariladi
		return result;
	}
}

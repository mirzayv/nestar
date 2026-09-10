// NestJS'ning ikkita dekoratori import qilinyapti: BadRequestException — xato holatida ishlatiladigan tayyor klass, Injectable — classni dependency injection uchun tayyorlaydigan decorator
import { BadRequestException, Injectable } from '@nestjs/common';
// InjectModel decorator-funksiyasi — Mongoose modelini constructor'ga in'ektsiya qilish uchun ishlatiladi
import { InjectModel } from '@nestjs/mongoose';
// mongoose paketidan Model (umumiy model tipi) va ObjectId (MongoDB ID tipi) import qilinyapti
import { Model, ObjectId } from 'mongoose';
// Like — like hujjatining to'liq DTO'si, MeLiked — qisqartirilgan, faqat tekshirish uchun ishlatiladigan DTO
import { Like, MeLiked } from '../../libs/dto/like/like';
// LikeInput — like yaratish/tekshirish uchun ishlatiladigan kirish DTO'si
import { LikeInput } from '../../libs/dto/like/like.input';
// Message — tayyor xato xabarlarining enum'i
import { Message } from '../../libs/enums/common.enum';
// T — umumiy "har qanday obyekt" tipi
import { T } from '../../libs/types/common';
// LikeGroup — like qaysi turdagi elementga tegishli ekanini bildiruvchi enum (masalan PROPERTY, MEMBER, ARTICLE)
import { LikeGroup } from '../../libs/enums/like.enum';
// OrdinaryInquiry — faqat page/limit maydonlaridan iborat oddiy so'rov DTO'si (bugun property.input.ts'ga qo'shilgan)
import { OrdinaryInquiry } from '../../libs/dto/property/property.input';
// Properties — mulklar ro'yxati (list) va umumiy son (metaCounter) DTO'si
import { Properties } from '../../libs/dto/property/property';
// lookupFavorite — config.ts'da yozilgan, sevimli mulk egasining ma'lumotini olish uchun tayyor $lookup obyekti
import { lookupFavorite } from '../../libs/config';

// @Injectable() decorator — bu classni NestJS'ning dependency injection tizimiga "ro'yxatdan o'tkazadi", uni boshqa joylarga in'ektsiya qilish mumkin bo'ladi
@Injectable()
// LikeService klassi export qilinyapti — boshqa fayllar buni import qila oladi
export class LikeService {
	// constructor — klass instansiyalanganda avtomatik chaqiriladigan maxsus metod
	constructor(
		// @InjectModel('Like') decorator orqali, MongoDB'dagi 'Like' modeli in'ektsiya qilinadi, 'likeModel' nomli private, faqat o'qiladigan (readonly) propertyga saqlanadi
		@InjectModel('Like') private readonly likeModel: Model<Like>,
	) {}

	// toggleLike — bitta LikeInput parametrini oladi, Promise<number> qaytaradi (like/unlike bo'lganda +1 yoki -1)
	public async toggleLike(input: LikeInput): Promise<number> {
		// qidiruv sharti tayyorlanadi — memberId va likeRefId bo'yicha
		const search: T = { memberId: input.memberId, likeRefId: input.likeRefId };
		// bazadan mos hujjat mavjudligi tekshiriladi, natija kutiladi
		const exist = await this.likeModel.findOne(search).exec();
		// modifier o'zgaruvchisi 1 bilan boshlang'ich qiymatga ega bo'ladi (yangi like qo'shilishi degan ma'noda)
		let modifier = 1;

		// agar hujjat allaqachon mavjud bo'lsa
		if (exist) {
			// mavjud hujjat o'chiriladi (unlike)
			await this.likeModel.findByIdAndDelete(exist._id).exec();
			// modifier -1 ga o'zgartiriladi
			modifier = -1;
		} else {
			// agar mavjud bo'lmasa
			try {
				// yangi like hujjati yaratiladi
				await this.likeModel.create(input);
			} catch (err) {
				// xato bo'lsa, konsolga chiqariladi
				console.log('Error, Service.model:', err instanceof Error ? err.message : err);
				// tayyor BadRequestException xatosi otiladi
				throw new BadRequestException(Message.CREATE_FAILED);
			}
		}

		// natijada modifier qiymati (1 yoki -1) qaytariladi
		return modifier;
	}

	// checkLikeExistence — LikeInput parametrini oladi, Promise<MeLiked[]> (massiv) qaytaradi
	public async checkLikeExistence(input: LikeInput): Promise<MeLiked[]> {
		// input obyektidan memberId va likeRefId destructuring orqali ajratib olinadi
		const { memberId, likeRefId } = input;
		// bazadan mos hujjat qidiriladi
		const result = await this.likeModel.findOne({ memberId, likeRefId }).exec();

		// agar topilsa — bitta elementli massiv qaytariladi (myFavorite: true bilan), aks holda bo'sh massiv
		return result ? [{ memberId, likeRefId, myFavorite: true }] : [];
	}

	// getFavoriteProperties — [128]-darsning asosiy metodi: memberId va OrdinaryInquiry (page/limit) parametrlarini oladi, Promise<Properties> qaytaradi
	public async getFavoriteProperties(memberId: ObjectId, input: OrdinaryInquiry): Promise<Properties> {
		// input obyektidan page va limit ajratib olinadi
		const { page, limit } = input;
		// match obyekti tayyorlanadi — faqat 'property' turidagi, faqat shu foydalanuvchining like'lari
		const match: T = { likeGroup: LikeGroup.PROPERTY, memberId: memberId };

		// data konstantasiga, aggregation natijasi await orqali kutib olinadi
		const data: T = await this.likeModel
			// aggregate metodi chaqiriladi, unga bosqichlar massivi uzatiladi
			.aggregate([
				// birinchi bosqich — filtrlash
				{ $match: match },
				// ikkinchi bosqich — eng yangi like'lar birinchi chiqadigan tartibda saralash
				{ $sort: { updatedAt: -1 } },
				{
					// uchinchi bosqich — oddiy $lookup, mulk hujjatini topish uchun
					$lookup: {
						// 'properties' collection'idan qidiriladi
						from: 'properties',
						// like hujjatining 'likeRefId' maydoni orqali
						localField: 'likeRefId',
						// mulk hujjatining '_id' maydoni bilan solishtiriladi
						foreignField: '_id',
						// natija 'favoriteProperty' nomi ostida qo'shiladi
						as: 'favoriteProperty',
					},
				},
				// to'rtinchi bosqich — $lookup natijasi massiv bo'lgani uchun, uni yozib, oddiy obyektga aylantiradi
				{ $unwind: '$favoriteProperty' },
				{
					// beshinchi bosqich — bitta oqimni ikkiga bo'ladi
					$facet: {
						// list qismi — sahifalangan ro'yxat
						list: [
							// nechta hujjat "tashlab o'tiladi" (sahifalash uchun)
							{ $skip: (page - 1) * limit },
							// nechta hujjat olinadi
							{ $limit: limit },
							// mulk egasining ma'lumotini qo'shadigan tayyor $lookup obyekti
							lookupFavorite,
							// ichki 'favoriteProperty.memberData' massivini oddiy obyektga aylantiradi
							{ $unwind: '$favoriteProperty.memberData' },
						],
						// metaCounter qismi — filtrlangan (sahifalanmagan) umumiy son
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			// .exec() — so'rovni haqiqatan bazaga yuboradi, natija Promise sifatida qaytadi
			.exec();

		// bo'sh Properties obyekti tayyorlanadi, metaCounter to'g'ridan-to'g'ri ko'chiriladi
		const result: Properties = { list: [], metaCounter: data[0].metaCounter };
		// data[0].list massividagi har bir elementdan faqat 'favoriteProperty' qismi ajratib olinadi (map metodi orqali)
		result.list = data[0].list.map((ele: T) => ele.favoriteProperty);

		// tayyor natija qaytariladi
		return result;
	}
}

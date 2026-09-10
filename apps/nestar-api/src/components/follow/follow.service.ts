// NestJS'ning uchta narsasi import qilinyapti: BadRequestException va InternalServerErrorException — tayyor xato klasslari, Injectable — dependency injection uchun decorator
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
// InjectModel decorator-funksiyasi — Mongoose modelini constructor'ga in'ektsiya qilish uchun ishlatiladi
import { InjectModel } from '@nestjs/mongoose';
// mongoose paketidan Model (umumiy model tipi) va ObjectId (MongoDB ID tipi) import qilinyapti
import { Model, ObjectId } from 'mongoose';
// Follower, Following, Followers, Followings — follow bilan bog'liq to'rtta turli DTO (birlik va ko'plik shakllari)
import { Follower, Following, Followers, Followings } from '../../libs/dto/follow/follow';
// FollowInquiry — followers/followings ro'yxatini so'rash uchun kirish DTO'si
import { FollowInquiry } from '../../libs/dto/follow/follow.input';
// MemberService — a'zolar bilan bog'liq statistikani (followers/followings sonini) yangilash uchun kerak bo'ladigan boshqa servis
import { MemberService } from '../member/member.service';
// Direction — saralash yo'nalishi (ASC/DESC) enum'i, Message — tayyor xato xabarlari enum'i
import { Direction, Message } from '../../libs/enums/common.enum';
// to'rtta lookup funksiya/obyekt import qilinyapti config.ts'dan
import {
	// lookupFollowingData — following a'zoning ma'lumotini olish uchun tayyor $lookup obyekti
	lookupFollowingData,
	// lookupFollowerData — follower a'zoning ma'lumotini olish uchun tayyor $lookup obyekti
	lookupFollowerData,
	// lookupAuthMemberLiked — hozirgi foydalanuvchi like bosganmi tekshiruvchi funksiya
	lookupAuthMemberLiked,
	// lookupAuthMemberFollowed — hozirgi foydalanuvchi obuna bo'lganmi tekshiruvchi curry funksiya
	lookupAuthMemberFollowed,
} from '../../libs/config';

// @Injectable() decorator — bu classni dependency injection tizimiga ro'yxatdan o'tkazadi
@Injectable()
// FollowService klassi export qilinyapti
export class FollowService {
	// constructor — ikkita narsa in'ektsiya qilinadi
	constructor(
		// @InjectModel('Follow') orqali MongoDB'dagi 'Follow' modeli in'ektsiya qilinadi, tipi Follower yoki Following bo'lishi mumkin (union type)
		@InjectModel('Follow') private readonly followModel: Model<Follower | Following>,
		// MemberService in'ektsiya qilinadi — boshqa servis, statistika yangilash uchun
		private readonly memberService: MemberService,
	) {}

	// subscribe — ikkita ObjectId parametrini oladi (followerId, followingId), Promise<Follower> qaytaradi
	public async subscribe(followerId: ObjectId, followingId: ObjectId): Promise<Follower> {
		// agar followerId va followingId bir xil bo'lsa (o'ziga o'zi obuna bo'lish)
		if (followerId.toString() === followingId.toString()) {
			// xato otiladi — o'ziga obuna bo'lish taqiqlangan
			throw new InternalServerErrorException(Message.SELF_SUBSCRIPTION_DENIED);
		}

		// obuna bo'linayotgan a'zo mavjudligi tekshiriladi, memberService.getMember chaqirilib, natija kutiladi
		const targetMember = await this.memberService.getMember(null as any, followingId);
		// agar topilmasa — xato otiladi
		if (!targetMember) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		// haqiqiy obuna yozuvi yaratiladi, private metod chaqiriladi, natija kutiladi
		const result = await this.registerSubscription(followerId, followingId);

		// follower'ning "memberFollowings" statistikasi +1 ga oshiriladi
		await this.memberService.memberStatsEditor({
			_id: followerId,
			targetKey: 'memberFollowings',
			modifier: 1,
		});

		// following'ning "memberFollowers" statistikasi +1 ga oshiriladi
		await this.memberService.memberStatsEditor({
			_id: followingId,
			targetKey: 'memberFollowers',
			modifier: 1,
		});

		// yaratilgan follow hujjati qaytariladi
		return result;
	}

	// registerSubscription — private metod, ikkita ObjectId oladi, Promise<Follower> qaytaradi
	private async registerSubscription(followerId: ObjectId, followingId: ObjectId): Promise<Follower> {
		// try/catch bloki — xatolarni ushlab qolish uchun
		try {
			// yangi follow hujjati yaratiladi, natija Follower tipiga majburiy o'zgartiriladi (as unknown as Follower)
			return (await this.followModel.create({ followerId, followingId })) as unknown as Follower;
		} catch (err) {
			// xato konsolga chiqariladi
			console.log('Error, Service.model:', err);
			// tayyor xato otiladi
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	// unsubscribe — obunani bekor qilish, ikkita ObjectId oladi (followingId birinchi, followerId ikkinchi — tartibga e'tibor bering), Promise<Follower> qaytaradi
	public async unsubscribe(followingId: ObjectId, followerId: ObjectId): Promise<Follower> {
		// obuna bo'lingan a'zo mavjudligi tekshiriladi
		const targetMember = await this.memberService.getMember(null as any, followingId);
		// agar topilmasa — xato
		if (!targetMember) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		// mos follow hujjati topilib, o'chiriladi, natija kutiladi
		const result = await this.followModel.findOneAndDelete({ followingId, followerId }).exec();
		// agar hujjat topilmasa (o'chirilmagan bo'lsa) — xato
		if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		// follower'ning "memberFollowings" statistikasi -1 ga kamaytiriladi
		await this.memberService.memberStatsEditor({
			_id: followerId,
			targetKey: 'memberFollowings',
			modifier: -1,
		});

		// following'ning "memberFollowers" statistikasi -1 ga kamaytiriladi
		await this.memberService.memberStatsEditor({
			_id: followingId,
			targetKey: 'memberFollowers',
			modifier: -1,
		});

		// o'chirilgan hujjat Follower tipiga majburiy o'zgartirilib qaytariladi
		return result as unknown as Follower;
	}

	// getMemberFollowings — bugungi darsda o'zgargan metod, memberId (ObjectId) va FollowInquiry parametrlarini oladi, Promise<Followings> qaytaradi
	public async getMemberFollowings(memberId: ObjectId, input: FollowInquiry): Promise<Followings> {
		// input obyektidan page, limit, search destructuring orqali ajratib olinadi
		const { page, limit, search } = input;
		// agar search.followerId berilmagan bo'lsa — xato otiladi (bu so'rov uchun majburiy)
		if (!search?.followerId) throw new InternalServerErrorException(Message.BAD_REQUEST);

		// match obyekti — faqat shu followerId'ga tegishli hujjatlar
		const match = { followerId: search.followerId };

		// aggregation natijasi await orqali kutib olinadi
		const result = await this.followModel
			.aggregate([
				// birinchi bosqich — filtrlash
				{ $match: match },
				// ikkinchi bosqich — yaratilgan sanasi bo'yicha kamayish tartibida saralash
				{ $sort: { createdAt: Direction.DESC } },
				{
					// uchinchi bosqich — bitta oqimni ikkiga bo'ladi
					$facet: {
						// list qismi
						list: [
							// sahifalash uchun tashlab o'tish
							{ $skip: (page - 1) * limit },
							// nechta olinadi
							{ $limit: limit },
							// hozirgi foydalanuvchi shu 'following' a'zoni like bosganmi tekshiradi, ikkinchi argument '$followingId' — chunki bu yerda tekshiriladigan element hujjatning followingId maydonidir
							lookupAuthMemberLiked(memberId, '$followingId'),
							// hozirgi foydalanuvchi shu 'following' a'zoga allaqachon obuna bo'lganmi tekshiradi — birinchi qavatda followerId/followingId sozlanadi, ikkinchi qavatda memberId/targetRefId beriladi
							lookupAuthMemberFollowed({ followerId: memberId, followingId: '$followingId' })(memberId, '$followingId'),
							// following a'zoning to'liq ma'lumotini qo'shadi
							lookupFollowingData,
							// natija massivini oddiy obyektga aylantiradi
							{ $unwind: '$followingData' },
						],
						// metaCounter qismi — umumiy son
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		// agar natija bo'sh bo'lsa (optional chaining ?. orqali xavfsiz tekshiriladi) — xato
		if (!result?.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		// birinchi (va yagona) $facet natijasi qaytariladi
		return result[0];
	}

	// getMemberFollowers — xuddi shunday, lekin teskari yo'nalishda: kim menga obuna bo'lgan
	public async getMemberFollowers(memberId: ObjectId, input: FollowInquiry): Promise<Followers> {
		// input obyektidan page, limit, search ajratib olinadi
		const { page, limit, search } = input;
		// agar search.followingId berilmagan bo'lsa — xato
		if (!search?.followingId) throw new InternalServerErrorException(Message.BAD_REQUEST);

		// match obyekti — faqat shu followingId'ga tegishli hujjatlar
		const match = { followingId: search.followingId };

		// aggregation natijasi kutib olinadi
		const result = await this.followModel
			.aggregate([
				// filtrlash
				{ $match: match },
				// saralash
				{ $sort: { createdAt: Direction.DESC } },
				{
					$facet: {
						list: [
							// sahifalash
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							// hozirgi foydalanuvchi shu 'follower' a'zoni like bosganmi tekshiradi, ikkinchi argument '$followerId'
							lookupAuthMemberLiked(memberId, '$followerId'),
							// hozirgi foydalanuvchi shu 'follower' a'zoga obuna bo'lganmi tekshiradi
							lookupAuthMemberFollowed({ followerId: memberId, followingId: '$followerId' })(memberId, '$followerId'),
							// follower a'zoning to'liq ma'lumotini qo'shadi
							lookupFollowerData,
							// natija massivini oddiy obyektga aylantiradi
							{ $unwind: '$followerData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		// agar natija bo'sh bo'lsa — xato (bu yerda ?. ishlatilmagan, oddiy .length)
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		// natija qaytariladi
		return result[0];
	}
}

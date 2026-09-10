// NestJS'ning uchta narsasi: Injectable — dependency injection decorator, BadRequestException va InternalServerErrorException — tayyor xato klasslari
import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
// InjectModel decorator-funksiyasi — Mongoose modelini in'ektsiya qilish uchun
import { InjectModel } from '@nestjs/mongoose';
// mongoose paketidan Model va ObjectId tiplari
import { Model, ObjectId } from 'mongoose';
// BoardArticle, BoardArticles — maqola bilan bog'liq birlik va ko'plik DTO'lari
import { BoardArticle, BoardArticles } from '../../libs/dto/board-article/board-article';
// uchta kirish DTO'si import qilinyapti
import {
	// BoardArticleInput — yangi maqola yaratish uchun
	BoardArticleInput,
	// BoardArticlesInquiry — maqolalar ro'yxatini so'rash uchun
	BoardArticlesInquiry,
	// AllBoardArticlesInquiry — admin uchun barcha maqolalarni so'rash uchun
	AllBoardArticlesInquiry,
} from '../../libs/dto/board-article/board-article.input';
// BoardArticleUpdate — maqolani yangilash uchun kirish DTO'si
import { BoardArticleUpdate } from '../../libs/dto/board-article/board-article.update';
// ViewService — ko'rishlarni qayd qilish uchun boshqa servis
import { ViewService } from '../view/view.service';
// Direction — saralash yo'nalishi, Message — tayyor xato xabarlari
import { Direction, Message } from '../../libs/enums/common.enum';
// BoardArticleStatus — maqola holati enum'i (ACTIVE, DELETE va h.k.)
import { BoardArticleStatus } from '../../libs/enums/board-article.enum';
// ViewGroup — ko'rish qaysi turga tegishli ekanini bildiruvchi enum
import { ViewGroup } from '../../libs/enums/view.enum';
// uchta narsa config.ts'dan import qilinyapti: lookupAuthMemberLiked (bugun qo'shilgan), lookupMember, shapeIntoMongoObjectId
import { lookupAuthMemberLiked, lookupMember, shapeIntoMongoObjectId } from '../../libs/config';
// StatisticModifier, T — umumiy tiplar
import { StatisticModifier, T } from '../../libs/types/common';
// MemberService — a'zolar bilan bog'liq boshqa servis
import { MemberService } from '../member/member.service';
// LikeService — like bilan bog'liq boshqa servis
import { LikeService } from '../like/like.service';
// LikeInput — like kirish DTO'si
import { LikeInput } from '../../libs/dto/like/like.input';
// LikeGroup — like turi enum'i
import { LikeGroup } from '../../libs/enums/like.enum';

// @Injectable() decorator — dependency injection uchun
@Injectable()
// BoardArticleService klassi export qilinyapti
export class BoardArticleService {
	// constructor — to'rtta narsa in'ektsiya qilinadi
	constructor(
		// 'BoardArticle' modeli in'ektsiya qilinadi
		@InjectModel('BoardArticle') private readonly boardArticleModel: Model<BoardArticle>,
		// MemberService in'ektsiya qilinadi
		private readonly memberService: MemberService,
		// ViewService in'ektsiya qilinadi
		private readonly viewService: ViewService,
		// LikeService in'ektsiya qilinadi
		private readonly likeService: LikeService,
	) {}

	// createBoardArticle — memberId va BoardArticleInput oladi, Promise<BoardArticle> qaytaradi
	public async createBoardArticle(memberId: ObjectId, input: BoardArticleInput): Promise<BoardArticle> {
		// kirish obyektiga memberId qo'lda joylanadi
		input.memberId = memberId;
		// try/catch bloki
		try {
			// yangi maqola hujjati yaratiladi
			const result = await this.boardArticleModel.create(input);
			// a'zoning "memberArticles" statistikasi +1 ga oshiriladi
			await this.memberService.memberStatsEditor({
				_id: memberId,
				targetKey: 'memberArticles',
				modifier: 1,
			});
			// natija qaytariladi
			return result;
		} catch (err: any) {
			// xato konsolga chiqariladi
			console.log('Error, Service.model:', err.message);
			// tayyor xato otiladi
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	// getBoardArticle — bitta maqolani olish, memberId va articleId oladi, Promise<BoardArticle> qaytaradi
	public async getBoardArticle(memberId: ObjectId, articleId: ObjectId): Promise<BoardArticle> {
		// qidiruv sharti — faqat faol maqola
		const search: T = {
			_id: articleId,
			articleStatus: BoardArticleStatus.ACTIVE,
		};

		// bazadan maqola qidiriladi, .lean() orqali oddiy JS obyekt sifatida
		const targetBoardArticle: BoardArticle | null = await this.boardArticleModel
			.findOne(search)
			.lean<BoardArticle>()
			.exec();
		// agar topilmasa — xato
		if (!targetBoardArticle) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		// agar so'rovchi ID'si mavjud bo'lsa
		if (memberId) {
			// ko'rish kirish obyekti tayyorlanadi
			const viewInput = { memberId: memberId, viewRefId: articleId, viewGroup: ViewGroup.ARTICLE };
			// ko'rish qayd qilinadi
			const newView = await this.viewService.recordView(viewInput);
			// agar yangi ko'rish bo'lsa
			if (newView) {
				// articleViews statistikasi +1 ga oshiriladi
				await this.boardArticleStatsEditor({ _id: articleId, targetKey: 'articleViews', modifier: 1 });
				// lokal obyektdagi son ham +1 qilinadi, ?? 0 — agar oldin undefined bo'lsa, 0dan boshlanadi
				targetBoardArticle.articleViews = (targetBoardArticle.articleViews ?? 0) + 1;
			}

			// like kirish obyekti tayyorlanadi
			const likeInput: LikeInput = { memberId, likeRefId: articleId, likeGroup: LikeGroup.ARTICLE };
			// like mavjudligi tekshiriladi, natija meLiked maydoniga yoziladi
			targetBoardArticle.meLiked = await this.likeService.checkLikeExistence(likeInput);
		}

		// maqola egasining to'liq ma'lumoti olinadi, memberData maydoniga yoziladi
		targetBoardArticle.memberData = await this.memberService.getMember(
			memberId,
			shapeIntoMongoObjectId(targetBoardArticle.memberId),
		);
		// tayyor maqola qaytariladi
		return targetBoardArticle;
	}

	// updateBoardArticle — memberId va BoardArticleUpdate oladi, Promise<BoardArticle> qaytaradi
	public async updateBoardArticle(memberId: ObjectId, input: BoardArticleUpdate): Promise<BoardArticle> {
		// input obyektidan _id va articleStatus ajratib olinadi
		const { _id, articleStatus } = input;

		// mos maqola topilib, yangilanadi (faqat egasi o'zgartira oladi)
		const result = await this.boardArticleModel
			.findOneAndUpdate({ _id: _id, memberId: memberId, articleStatus: BoardArticleStatus.ACTIVE }, input, {
				new: true,
			})
			.exec();
		// agar topilmasa — xato
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		// agar status DELETE'ga o'zgartirilgan bo'lsa
		if (articleStatus === BoardArticleStatus.DELETE) {
			// a'zoning "memberArticles" statistikasi -1 ga kamaytiriladi
			await this.memberService.memberStatsEditor({
				_id: memberId,
				targetKey: 'memberArticles',
				modifier: -1,
			});
		}

		// natija qaytariladi
		return result;
	}

	// getBoardArticles — bugungi darsda o'zgargan metod, memberId va BoardArticlesInquiry oladi, Promise<BoardArticles> qaytaradi
	public async getBoardArticles(memberId: ObjectId, input: BoardArticlesInquiry): Promise<BoardArticles> {
		// input.search'dan ikkita maydon ajratib olinadi, 'as any' — TypeScript tekshiruvini vaqtincha o'chirish uchun
		const { articleCategory, text } = input.search as any;
		// match obyekti — faqat faol maqolalar
		const match: T = { articleStatus: BoardArticleStatus.ACTIVE };
		// sort obyekti
		const sort: T = { [input?.sort ?? 'createdAt']: input.direction ?? Direction.DESC };

		// agar articleCategory berilgan bo'lsa, filtrga qo'shiladi
		if (articleCategory) match.articleCategory = articleCategory;
		// agar text berilgan bo'lsa, regex qidiruv qo'shiladi
		if (text) match.articleTitle = { $regex: new RegExp(text, 'i') };
		// agar search.memberId berilgan bo'lsa
		if (input.search?.memberId) {
			// string ID MongoDB ObjectId'ga aylantirilib, filtrga qo'shiladi
			match.memberId = shapeIntoMongoObjectId(input.search.memberId);
		}
		// debug uchun konsolga chiqariladi
		console.log('match:', match);

		// aggregation natijasi kutib olinadi
		const result = await this.boardArticleModel
			.aggregate([
				// filtrlash
				{ $match: match },
				// saralash
				{ $sort: sort },
				{
					$facet: {
						list: [
							// sahifalash, ?? 1 va ?? 10 — agar page/limit berilmagan bo'lsa, standart qiymatlar
							{ $skip: ((input.page ?? 1) - 1) * (input.limit ?? 10) },
							{ $limit: input.limit ?? 10 },
							// hozirgi foydalanuvchi shu maqolani like bosganmi tekshiradi — bugun qo'shilgan qator
							lookupAuthMemberLiked(memberId),
							// maqola egasining ma'lumotini qo'shadi
							lookupMember,
							// natija massivini oddiy obyektga aylantiradi
							{ $unwind: '$memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		// agar natija bo'sh bo'lsa — xato
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		// natija qaytariladi
		return result[0];
	}

	// getAllBoardArticlesByAdmin — admin uchun, meLiked YO'Q, AllBoardArticlesInquiry oladi, Promise<BoardArticles> qaytaradi
	public async getAllBoardArticlesByAdmin(input: AllBoardArticlesInquiry): Promise<BoardArticles> {
		// input.search'dan ikkita maydon ajratib olinadi
		const { articleStatus, articleCategory } = input.search as any;
		// bo'sh match obyekti
		const match: T = {};
		// sort obyekti
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		// agar articleStatus berilgan bo'lsa, filtrga qo'shiladi
		if (articleStatus) match.articleStatus = articleStatus;
		// agar articleCategory berilgan bo'lsa, filtrga qo'shiladi
		if (articleCategory) match.articleCategory = articleCategory;

		// aggregation natijasi kutib olinadi — bu yerda lookupAuthMemberLiked YO'Q, chunki admin funksiyasi
		const result = await this.boardArticleModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: ((input.page ?? 1) - 1) * (input.limit ?? 10) },
							{ $limit: input.limit ?? 10 },
							lookupMember,
							{ $unwind: '$memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	// updateBoardArticleByAdmin — admin uchun maqolani yangilash, BoardArticleUpdate oladi, Promise<BoardArticle> qaytaradi
	public async updateBoardArticleByAdmin(input: BoardArticleUpdate): Promise<BoardArticle> {
		// input obyektidan _id va articleStatus ajratib olinadi
		const { _id, articleStatus } = input;

		// mos maqola topilib, yangilanadi (memberId tekshiruvi yo'q, chunki admin har qanday maqolani o'zgartira oladi)
		const result = await this.boardArticleModel
			.findOneAndUpdate({ _id: _id, articleStatus: BoardArticleStatus.ACTIVE }, input, {
				new: true,
			})
			.exec();
		// agar topilmasa — xato
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		// agar status DELETE'ga o'zgartirilgan bo'lsa
		if (articleStatus === BoardArticleStatus.DELETE) {
			// maqola egasining statistikasi -1 ga kamaytiriladi
			await this.memberService.memberStatsEditor({
				_id: shapeIntoMongoObjectId(result.memberId),
				targetKey: 'memberArticles',
				modifier: -1,
			});
		}

		// natija qaytariladi
		return result;
	}

	// removeBoardArticleByAdmin — admin uchun, articleId oladi, Promise<BoardArticle> qaytaradi
	public async removeBoardArticleByAdmin(articleId: ObjectId): Promise<BoardArticle> {
		// qidiruv sharti — faqat allaqachon DELETE holatidagi maqola (ikki bosqichli o'chirish)
		const search: T = { _id: articleId, articleStatus: BoardArticleStatus.DELETE };
		// hujjat topilib, butunlay o'chiriladi
		const result = await this.boardArticleModel.findOneAndDelete(search).exec();
		// agar topilmasa — xato
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);

		// natija qaytariladi
		return result;
	}

	// likeTargetBoardArticle — maqolaga like bosish/olib tashlash, memberId va likeRefId oladi, Promise<BoardArticle> qaytaradi
	public async likeTargetBoardArticle(memberId: ObjectId, likeRefId: ObjectId): Promise<BoardArticle> {
		// like bosiladigan maqola mavjudligi tekshiriladi
		const target = await this.boardArticleModel
			.findOne({ _id: likeRefId, articleStatus: BoardArticleStatus.ACTIVE })
			.exec();
		// agar topilmasa — xato
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		// like kirish obyekti tayyorlanadi
		const input: LikeInput = { memberId, likeRefId, likeGroup: LikeGroup.ARTICLE };
		// like/unlike qilinadi, modifier qaytadi
		const modifier: number = await this.likeService.toggleLike(input);

		// maqolaning "articleLikes" statistikasi yangilanadi
		const result = await this.boardArticleStatsEditor({ _id: likeRefId, targetKey: 'articleLikes', modifier });
		// agar muvaffaqiyatsiz bo'lsa — xato
		if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);

		// natija qaytariladi
		return result;
	}

	// boardArticleStatsEditor — maqolaning istalgan sonli maydonini oshirish/kamaytirish uchun umumiy metod, StatisticModifier oladi, Promise<BoardArticle | null> qaytaradi
	public async boardArticleStatsEditor(input: StatisticModifier): Promise<BoardArticle | null> {
		// input obyektidan uchta maydon ajratib olinadi
		const { _id, targetKey, modifier } = input;
		// $inc operatori orqali maydon yangilanadi, .lean() orqali oddiy JS obyekt sifatida qaytariladi
		return await this.boardArticleModel
			.findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true })
			.lean<BoardArticle>()
			.exec();
	}
}

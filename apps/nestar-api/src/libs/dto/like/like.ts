import { Field, ObjectType } from '@nestjs/graphql';
import type { ObjectId } from 'mongoose';
import { LikeGroup } from '../../enums/like.enum';

@ObjectType()
export class MeLiked {
	@Field(() => String)
	memberId!: ObjectId;

	@Field(() => String)
	likeRefId!: ObjectId;

	@Field(() => Boolean)
	myFavorite!: boolean;
}

@ObjectType()
export class Like {
	@Field(() => String)
	_id!: ObjectId;

	@Field(() => String)
	memberId!: ObjectId;

	@Field(() => String)
	likeRefId!: ObjectId;

	@Field(() => LikeGroup)
	likeGroup!: LikeGroup;

	@Field(() => Date)
	createdAt!: Date;

	@Field(() => Date)
	updatedAt!: Date;
}

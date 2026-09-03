import { Field, Int, ObjectType } from '@nestjs/graphql';
import * as mongoose from 'mongoose';
import { CommentGroup, CommentStatus } from '../../enums/comment.enum';
import { Member, TotalCounter } from '../member/member';

@ObjectType()
export class Comment {
	@Field(() => String)
	_id!: mongoose.ObjectId;

	@Field(() => CommentStatus)
	commentStatus!: CommentStatus;

	@Field(() => CommentGroup)
	commentGroup!: CommentGroup;

	@Field(() => String)
	commentContent!: string;

	@Field(() => String)
	commentRefId!: mongoose.ObjectId;

	@Field(() => String)
	memberId!: mongoose.ObjectId;

	@Field(() => Date)
	createdAt!: Date;

	@Field(() => Date)
	updatedAt!: Date;

	/** from aggregation **/

	@Field(() => Member, { nullable: true })
	memberData?: Member;
}

@ObjectType()
export class Comments {
	@Field(() => [Comment])
	list!: Comment[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter!: TotalCounter[];
}

import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Length } from 'class-validator';
import { CommentStatus } from '../../enums/comment.enum';
import * as mongoose from 'mongoose';

@InputType()
export class CommentUpdate {
	@IsNotEmpty()
	@Field(() => String)
	_id: mongoose.ObjectId | undefined;

	@IsOptional()
	@Field(() => CommentStatus, { nullable: true })
	commentStatus?: CommentStatus;

	@IsOptional()
	@Length(1, 100)
	@Field(() => String, { nullable: true })
	commentContent?: string;
}

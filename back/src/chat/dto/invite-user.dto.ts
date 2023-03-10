import { IsNotEmpty, IsNumber } from "class-validator";
import { User } from "src/user/entities/user.entity";

export class InviteDto {
    @IsNotEmpty()
    user: User;

    @IsNumber()
    chanid: number;
}
import { Body, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Patch, Post, Req, Request, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { editFileName, imageFilter } from 'src/app.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { user } from 'src/game/game.controller';
import { FriendRequest } from './entities/friend-request.entity';
import { authenticator } from 'otplib';
import { Results } from 'src/results/entities/results.entity';
import { CreateResultDto } from 'src/results/dto/create-result.dto';
import { JwtGuard } from 'src/Oauth/jwt-auth.guard';
import { Server, Socket } from "socket.io";
import { userList } from 'src/app.gateway';
import { WebSocketServer } from '@nestjs/websockets';
import { plainToClass } from 'class-transformer';



@Controller('user')
export class UserController {
	@WebSocketServer()
  server: Server;

  constructor(private readonly userService: UserService) { }

  @Post()
  @UseGuards(JwtGuard)
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return await plainToClass(User, this.userService.create(createUserDto));
  }

  @Get()
  @UseGuards(JwtGuard)
  async findAll() {
    return await plainToClass(User, this.userService.findAll());
  }

  @Post('results')
  @UseGuards(JwtGuard)
  async createResults(@Body() resultDto: CreateResultDto) {
    return await this.userService.createResult(resultDto);
  }

  @Get('username/:username')
  @UseGuards(JwtGuard)
  async GetbyUsername(@Param('username') username: string) {
    return await plainToClass(User, this.userService.getByUsername(username));
  }

  @Get('id/:id')
  @UseGuards(JwtGuard)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await plainToClass(User, this.userService.getById(id));
  }

  @Get('game/:id')
  @UseGuards(JwtGuard)
  async getResult(@Param('id', ParseIntPipe) id: number) {
    return await plainToClass(Results, this.userService.getResults(id));
  }

  @Post('access_token')
  @UseGuards(JwtGuard)
  async GetbyAccessToken(@Body() token: any) {
    return await plainToClass(User, this.userService.GetByAccessToken(token));
  }

  @Post('2fa/qrcode')
  @UseGuards(JwtGuard)
  async enable2FA(@Body() user: { userId: number }) {
    const realUser = await this.userService.getById(user.userId);
    if (!realUser) {
      throw new NotFoundException(`User with id ${user.userId} not found`);
    }
    if (realUser.twoFaEnable == false)
    {
      const secret = authenticator.generateSecret();
      this.userService.enable2FA(realUser, secret);
      const otpauthURL = authenticator.keyuri('Transcendence', realUser.email, secret);
      const qrCode = await this.userService.generateQRCode(otpauthURL);
      return { qrCode };
    }
    else
      return ("Qr code active");
  }
  

  @Post('2fa/check')
  @UseGuards(JwtGuard)
  async checkCode(@Body() user: { userId: number, code: string}) {
    const result = await this.userService.check2FA(user.userId, user.code);
    return { result };
  }


  @Post('friend-request/status/:id')
  @UseGuards(JwtGuard)
  async GetFriendRequestStatus(@Param('id', ParseIntPipe) id: number, @Body() user: { userId: number }) {
    return this.userService.GetFriendRequestStatus(id, user.userId);
  }

  @Post('friendsRequest')
  @UseGuards(JwtGuard)
  GetFriendsRequest(@Body() user: { userId: number }) {
    return this.userService.GetFriendsRequest(user.userId);
  }

  @Post('friends')
  @UseGuards(JwtGuard)
  GetFriends(@Body() user: { userId: number }) {
    return this.userService.GetFriends(user.userId);
  }

  @Post('matches')
  @UseGuards(JwtGuard)
  GetMatches(@Body() user: { userId: number }) {
    return this.userService.GetMatchRequest(user.userId);
  }

  @Post("friends/accept")
  @UseGuards(JwtGuard)
  async acceptFriendRequest(@Body() body: { friendId: number, userId: number }) {
    console.log("friendId = ", body.friendId);
    console.log("userId = ", body.userId);
    
    const realUser = await this.userService.addFriend(body.friendId, body.userId);
    return await this.userService.DeleteFriendRequest(body.userId, body.friendId);
  }
  

  @Post("friends/decline")
  @UseGuards(JwtGuard)
  async declineFriendRequest(@Body() body: { friendId: number, userId: number }) {
    return await this.userService.DeleteFriendRequest(body.userId, body.friendId);
  }

  @Get(':id/avatar')
  async getAvatar(@Param('id', ParseIntPipe) id: number, @Req() req: Request, @Res() res: Response) {
    const user = await this.userService.getById(id);
    if (user) {
      if (user.avatar) {
        return res.sendFile(user.avatar, { root: './storage/images/' });
      } else {
        return res.redirect(user.intra_avatar)
      }
    } else {
      return null;
    }
  }

  @Post('friend/check')
  @UseGuards(JwtGuard)
  async checkFriends(@Body() body: { myId: number, friendId: number}) {
    return (await this.userService.checkFriends(body.myId, body.friendId));
  }

  @Patch(':id/avatar')
  @UseGuards(JwtGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './storage/images/',
        filename: editFileName,
      }),
      fileFilter: imageFilter,
    }),
  )
  async setAvatar(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: any, @Body('username') username: string) {
    await this.userService.setAvatar(id, username, file);
    return { message: 'Avatar set successfully' };
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: string, @Body() user: any) {
    return plainToClass(User, this.userService.update(+id, user));
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: string) {
    return this.userService.remove(+id);
  }

  @Post('friend-request/send/:id')
  @UseGuards(JwtGuard)
  sendFriendRequest(
    @Param('id', ParseIntPipe) id: number, @Body() user: { userId: number }) {
      return this.userService.sendFriendRequest(id, user.userId)
  }

  @Delete('deletefriend/:id')
  async deleteFriend(@Param('id', ParseIntPipe) id: number, @Body() friend: User) {
    return await plainToClass(User, this.userService.removeFriend(id, friend));
  }

  @Post('block/:id')
  async addBlock(@Param('id') id: number, @Body() blockedId: { blockedId: number}) {
    console.log(id);
    console.log(blockedId);
    return await this.userService.addBlock(id, blockedId.blockedId);
  }

  @Delete('unblock/:id')
  async RmBlock(@Param('id') id: number, @Body()  blockedId: { blockedId: number}) {
    console.log("ca rentre la ");
    return await this.userService.RmBlock(id, blockedId.blockedId);
  }

  @Post("relations")
  @UseGuards(JwtGuard)
  async checkRelations(@Body() body: { userId: number,  friendId: number }) {
    console.log(body.friendId, body.userId)
    return await this.userService.checkRelations(body.friendId, body.userId);
  }
}

import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Results } from "src/results/entities/results.entity";
import { Repository } from "typeorm";
import { CreateUserDto } from "../user/dto/create-user.dto";
import { UpdateUserDto } from "../user/dto/update-user.dto";
import { User } from "./entities/user.entity";
import { FriendRequest } from "./entities/friend-request.entity";
import { FriendRequestDto } from "./dto/friend-request.dto";
import { JwtService } from "@nestjs/jwt";
import { FriendRequestStatus, FriendRequest_Status } from "./interface/friend-request.interface";
import { request } from "http";
import { sign } from 'jsonwebtoken';
import { authenticator } from "otplib";
import * as QRCode from 'qrcode';
import { CreateResultDto } from "src/results/dto/create-result.dto";
import { Server } from "http";
import { userList } from "src/app.gateway";
import { Channel } from "src/chat/channel/entities/channel.entity";
import { isNumber } from "class-validator";
// import { userList } from "src/app.gateway";

@Injectable()
export class UserService {

  server: Server;
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(FriendRequest)
    private readonly friendRequestRepository: Repository<FriendRequest>,
    @InjectRepository(Results)
    private readonly resultsRepository: Repository<Results>,
    private jwtService: JwtService,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const check = await this.usersRepository.findOneBy({
      login: createUserDto.login
    })
    if (check)
      return (check);
    const user: User = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  async createResult(resultDto: CreateResultDto) {
    const winner = await this.usersRepository.findOne({
      relations: {
        results: true,
      },
      where: { username: resultDto.winner }
    });
    const resultPush = await this.resultsRepository.save(resultDto);
    if (resultPush) {
      if (winner) {
        winner.win += 1;
        winner.elo += 50;
        winner.results.push(resultPush);
        await this.usersRepository.save(winner);
      }
      const loser = await this.usersRepository.findOne({
        relations: {
          results: true,
        },
        where: { username: resultDto.loser }
      });
      if (loser) {
        loser.lose += 1;
        loser.elo -= 50;
        loser.results.push(resultPush);
        await this.usersRepository.save(loser);
      }
      return resultPush;
    }
  }

  async save(updateUserDto: UpdateUserDto) {
    return (await this.usersRepository.save(updateUserDto));
  }

  async delete(updateUserDto: UpdateUserDto) {
    return (await this.usersRepository.delete(updateUserDto));
  }


  async generateQRCode(secret: string): Promise<string> {
    const qrCode = await QRCode.toDataURL(secret);
    return qrCode;
  }

  async enable2FA(user: any, secret: string): Promise<void> {
    user.two_factor_secret = secret;
    await this.usersRepository.save(user);
  }

  async check2FA(id: number, userCode: string): Promise<boolean> {
    const user = await this.usersRepository.findOneBy({ id: id });
    if (user) {
      return authenticator.check(userCode, user.two_factor_secret);
    }
    throw new NotFoundException("User not found");
  }

  findAll() {
    return this.usersRepository.find();
  }

  getById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      relations: {
        friends: true,
        results: true,
        channels: true,
      },
      where: { id: id }
    });
  }

  getByLogin(login: string): Promise<User | null> {
    return this.usersRepository.findOne({
      relations: { blocked: true },
      where: {
        login: login,
      }
    })
  }

  async GetByAccessToken(access_token: any) {

    const decoded_access_token: any = await this.jwtService.decode(access_token.token, { json: true });
    const user = await this.usersRepository.findOneBy({ login: decoded_access_token.username });
    if (decoded_access_token.exp && decoded_access_token.exp < Date.now() / 1000) {
      throw new NotFoundException("Token expired");
    }
    else if (user) {
      // let i : number = 0;
      // while (i < userList.length)
      // {
      //   if (userList[i].handshake.auth.user.id === user.id)
      //     throw new BadRequestException(); // User already logged in
      //   i++;
      // }
      for (const iterator of userList) {
        if (iterator.handshake.auth.user.id === user.id)
          throw new BadRequestException("t'as deja un tab frero");
      }
      return user;
    }
    throw new NotFoundException("Token user not found");
  }

  async getByUsername(username: string) {
    const userfindName = await this.usersRepository.findOne({
      relations: {
        friends: true,
        results: true,
      },
      where: { username: username }
    });
    if (userfindName)
      return userfindName;
    else
      throw new NotFoundException("Username dont exist");
  }

  async update(id: number, userUpdate: any) {
    const user = await this.usersRepository.findOneBy({
      id: id,
    })
    if (user) {
      //Si vous voulez plus de chose a update, mettez le dans le body et faites un iff
      if (userUpdate.username) {
        // console.log("username");

        const checkUsername = await this.usersRepository.findOneBy({
          username: userUpdate.username,
        })
        if (checkUsername && checkUsername.id !== user.id) {
          console.log("username exist"); // ca erntre jusque ici 
          throw new NotFoundException("Username exists");
        }
        else
          user.username = userUpdate.username;
      }
      if (userUpdate.status) {
        user.status = userUpdate.status;

      }
      if (userUpdate.status)
        user.status = userUpdate.status;
      if (userUpdate.twoFaEnable != undefined) {
        user.twoFaEnable = userUpdate.twoFaEnable;
      }

      return await this.usersRepository.save(user);
    }
    else
      throw new NotFoundException("User not found")
  }

  async remove(id: number) {
    const user = await this.usersRepository.findOneBy({
      id: id,
    })
    if (!user)
      throw new NotFoundException("User not found")
    this.usersRepository.delete(id);
    return `This action removes a #${id} user`;
  }

  async setAvatar(id: number, username: string, file: any) {
    const user = await this.usersRepository.findOneBy({
      id: id,
    })
    if (user) {
      user.avatar = file.filename;
      user.username = username;
      return await this.usersRepository.save(user);
    }
    throw new NotFoundException("User not found")
  }

  async sendFriendRequest(friendId: number, creatorId: number) {
    if (friendId == creatorId) {
      return ({ message: "You can't add yourself" });
    }
    const creator = await this.usersRepository.findOneBy({
      id: creatorId,
    })
    if (!creator) {
      throw new NotFoundException("creator doesn't exists");
    }

    const friend: User | null = await this.usersRepository.findOne({
      relations: {
        friends: true,
      },
      where: { id: friendId }
    });
    if (!friend) {
      return ({ message: 'Friend does not exist' });
    }

    const user: User | null = await this.usersRepository.findOne({
      relations: {
        friends: true,
      },
      where: { id: creator.id }
    });
    if (!user) {
      throw new NotFoundException("User not found")
    }
    const existingRequest = await this.friendRequestRepository.findOne({
      relations: {
        creator: true,
        receiver: true,
      },
      where: [{ creator: creator, receiver: friend }]
    });

    if (existingRequest) {
      throw new UnauthorizedException("Friend Request already send")
    }
    const friendRequest: FriendRequestDto = {
      creatorId: creator.id,
      creator: creator,
      receiverId: creator.id,
      receiver: friend,
      status: 'Pending'
    }

    await this.friendRequestRepository.save(friendRequest);
    const friendRequestPush: FriendRequest | null = await this.friendRequestRepository.findOne({
      where: [{ creator: creator, receiver: friend }]
    });
    if (friendRequestPush) {
      if (!friend.receiveFriendRequests)
        friend.receiveFriendRequests = [];
      friend.receiveFriendRequests.push(friendRequestPush);
      await this.usersRepository.save(friend);
      if (!user.sendFriendRequests)
        user.sendFriendRequests = [];
      user.sendFriendRequests.push(friendRequestPush);
      await this.usersRepository.save(user);
    }
    return { message: "Friend request sent" };
  }

  async DeleteFriendRequest(friendId: number, creatorId: number) {
    
    const friendRequestPush = await this.friendRequestRepository.findOne({
      where: [{ creatorId: creatorId, receiverId: friendId }]
    });
    console.log("friendRequestPush = ", friendRequestPush);
    
    if (friendRequestPush)
    {
      console.log("trying delete");  
      await this.friendRequestRepository.delete(friendRequestPush.id);
    }
    return await this.usersRepository.findOneBy({
      id: creatorId,
    })
  }

  async GetFriendRequestStatus(friendId: number, userId: number) {
    const creator = await this.usersRepository.findOneBy({
      id: userId,
    })
    if (!creator) {
      throw new NotFoundException("Creator doesn't exists");
    }

    const friendRequest = await this.friendRequestRepository.findOne({
      where: [{ creator: creator, receiver: { id: friendId } }]
    });
    if (!friendRequest) {
      throw new NotFoundException("Friend request does not exist");
    }
    return { status: friendRequest.status };
  }

  async GetFriendsRequest(userId: number) {

    const receiver = await this.usersRepository.findOne({
      relations: ['receiveFriendRequests', 'receiveFriendRequests.creator', 'friends'],
      where: { id: userId }
    });
    if (!receiver) {
      return [];
    }
    return receiver.receiveFriendRequests.map(request => {
      if (request.creator && request.creator.avatar) {
        return {
          name: request.creator.username,
          avatar: request.creator.avatar,
          id: request.creator.id,
          ReqStatus: request.status,
          UserStatus: request.creator.status,
        };
      }
      else {
        return {
          name: request.creator.username,
          avatar: request.creator.intra_avatar,
          id: request.creator.id,
          ReqStatus: request.status,
          UserStatus: request.creator.status,
        };
      }
      return {};
    });
  }

  async GetFriends(userId: number) {
    const user = await this.usersRepository.findOne({
      relations: ['friends'],
      where: { id: userId }
    });
    if (!user) {
      return [];
    }
    return user.friends.map(request => {
      if (request.avatar) {
        return {
          name: request.username,
          avatar: request.avatar,
          id: request.id,
          UserStatus: request.status,
        };
      }
      else {
        return {
          name: request.username,
          avatar: request.intra_avatar,
          id: request.id,
          UserStatus: request.status,
        };
      }
      return {};
    });
  }

  async GetMatchRequest(userId: number) {
    const my_user = await this.usersRepository.findOne({
      relations: ['results'],
      where: { id: userId }
    });
    if (!my_user) {
      return [];
    }
    return Promise.all(my_user.results.map(async request => {
      const [winner, loser] = await Promise.all([
        this.usersRepository.findOne({ where: { id: request.winnerId } }),
        this.usersRepository.findOne({ where: { id: request.loserId } })
      ]);
      return {
        id: request.id,
        winner: winner ? winner : "Unknown",
        winner_score: request.winner_score || 0,
        loser: loser ? loser : "Unknown",
        loser_score: request.loser_score || 0,
        winner_elo: winner ? request.winner_elo : 0,
        loser_elo: loser ? request.loser_elo : 0,
        winnerId: winner ? request.winnerId : 0,
        loserId: loser ? request.loserId : 0,
      };
    }))
  }


  async updateFriendRequestStatus(friendId: number, receiverId: number, status: FriendRequestStatus) {
    const receiver = await this.usersRepository.findOneBy({
      id: receiverId,
    })
    if (!receiver) {
      throw new NotFoundException("receiver doesn't exists");
    }

    const friendRequest = await this.friendRequestRepository.findOne({
      where: [{ creator: { id: friendId }, receiver: receiver }]
    });
    if (friendRequest) {
      if (status.status) {
        friendRequest.status = status.status;
      }
      return await this.friendRequestRepository.save(friendRequest);
    }
    throw new NotFoundException("Friend Request not found");
  }

  async addFriend(friendId: number, userId: number): Promise<User | null> {

    const realUser = await this.usersRepository.findOne({
      relations: {
        friends: true,
      },
      where: { id: userId }
    });
    if (!realUser)
      throw new NotFoundException("user doesn't exists");

    const friend = await this.usersRepository.findOne({
      relations: {
        friends: true,
      },
      where: { id: friendId }
    });
    if (!friend)
      throw new NotFoundException("friend doesn't exists")
    if (userId != friendId) {
      if (!realUser.friends) {
        realUser.friends = [];
      }

      if (!friend.friends) {
        friend.friends = [];
      }

      realUser.friends.push(friend);
      friend.friends.push(realUser);
      await this.usersRepository.save(friend);
      return await this.usersRepository.save(realUser);
    }
    return realUser;
  }

  async SetStatus(user: User, status: string): Promise<User | null> {
    if (!user)
      throw new HttpException(`user doesn't exists`, HttpStatus.BAD_REQUEST);
      
    const users = await this.usersRepository.findOne({where: { id: user.id }});
    if (users) {
      users.status = status;
      return await this.usersRepository.save(users);
    }
    return null;
  }

  async addFriendById(friendId: number, id: number): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      relations: {
        friends: true,
      },
      where: { id: id }
    });
    const friend = await this.usersRepository.findOne({ where: { id: friendId } });
    if (user && friend && id != friendId) {
      if (!user.friends) {
        user.friends = [];
      }
      user.friends.push(friend);
      return await this.usersRepository.save(user);
    }
    return user;
  }

  async removeFriend(id: number, friend: User) {
    const user = await this.usersRepository.findOne({
      relations: ['friends'],
      where: { id },
    });

    if (!user) {
      return;
    }
    user.friends = user.friends.filter((f) => f.id !== friend.id);
    return await this.usersRepository.save(user);
  }

  async checkFriends(myId: number, friendId: number): Promise<Boolean> {
    const myUser = await this.usersRepository.findOne({
      relations: ['friends'],
      where: { id: myId },
    });
    if (!myUser)
      return (false);
    // return true ou false si on trouve l'id du friend dans friend
    return (myUser.friends.some(friend => friend.id == friendId));
  }

  async getResults(id: number): Promise<Results[]> {
    const user = await this.usersRepository.findOne({
      relations: {
        results: true,
      },
      where: { id: id }
    });
    return user ? user.results : [];
  }

  async getBlocked(id: number) {
    const user = await this.usersRepository.findOne({
      relations: {
        blocked: true,
      },
      where: { id: id }
    });
    return user ? user.blocked : [];
  }

  async addBlock(id: number, blockedid: number) {
    console.log("ca block un peu ici ", id, blockedid);
    const user = await this.usersRepository.findOne({
      relations: {
        blocked: true,
      },
      where: { id: id }
    });
    if (user === null)
      throw new BadRequestException("No such User");
    const blocked = await this.usersRepository.findOne({
      relations: {
        blocked: true,
      },
      where: { id: blockedid }
    });
    if (blocked === null)
      throw new BadRequestException("No such User to block");
    if (user.blocked.find(elem => elem.id === blocked.id) !== undefined)
      throw new BadRequestException("User already blocked");
    user.blocked.push(blocked);
    return await this.usersRepository.save(user);
  }
  async RmBlock(id: number, blockedid: number) {
    const user = await this.usersRepository.findOne({
      relations: {
        blocked: true,
      },
      where: { id: id }
    });
    if (user === null)
      throw new BadRequestException("No such User");
    const blocked = user?.blocked.find(elem => elem.id = blockedid)
    if (blocked === undefined)
      throw new BadRequestException("No such User already blocked")
    const index = user.blocked.indexOf(blocked, 0);
    if (index != -1)
      user.blocked.splice(index, 1);
    return await this.usersRepository.save(user);
  }

  async checkRelations(friendId: number, userId: number) {
    const realUser = await this.usersRepository.findOne({
      relations: {
        friends: true,
        blocked: true,
        sendFriendRequests: {
          creator: true,
          receiver: true,
        },
        receiveFriendRequests: {
          creator: true,
          receiver: true,
        },
      },
      where: { id: userId },
    });

    if (!realUser) {
      throw new NotFoundException("User doesn't exist");
    }

    const friend = realUser.friends.find((friend) => friend.id === friendId);

    if (friend) {
      return ({ relation: "Friend" });
    }

    const blocked = realUser.blocked.find((blocked) => blocked.id === friendId);

    if (blocked) {
      return ({ relation: "Blocked" });
    }

    if (realUser.sendFriendRequests) {
      const friendRequestSent = realUser.sendFriendRequests.find(
        (request) => request.receiver.id === friendId
      );

      if (friendRequestSent) {
        return ({ relation: "friendRequestSent" });
      }
    }

    if (realUser.receiveFriendRequests) {
      const friendRequestReceived = realUser.receiveFriendRequests.find(
        (request) => request.creator.id === friendId
      );

      if (friendRequestReceived) {
        return ({ relation: "friendRequestReceived" });
      }
    }
    return ({ relation: "Nobody" });
  }


}

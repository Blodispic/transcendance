import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { AddUserDto } from './dto/add-user.dto';
import { Channel } from './entities/channel.entity';
import { UserService } from 'src/user/user.service';
import { UserController } from 'src/user/user.controller';
import { RmUserDto } from './dto/rm-user.dto';
import { MuteUserDto } from '../dto/mute-user.dto';
import { CreateChannelDto } from '../dto/create-channel.dto';
import { GiveAdminDto } from '../dto/give-admin.dto';

@Injectable()
export class ChannelService {
	constructor(
		@InjectRepository(Channel)
		private channelRepository: Repository<Channel>,
		private userService: UserService,
		// @InjectRepository(User)
		// private userRepository: Repository<User>,

	) {}

	async create(createChannelDto: CreateChannelDto, user: User) {
		const channel: Channel = this.channelRepository.create({
			name: createChannelDto.chanName,
			password: createChannelDto.password,
			owner: [user],
			users: [user],
			chanType: createChannelDto.chanType,
		});
		return this.channelRepository.save(channel);
	}

	async add(addUserDto: AddUserDto) {
		const channel: Channel | null = await this.channelRepository.findOne({
			relations: { users: true },
			where: {
				id: addUserDto.chanId
			}
			});
		// const user: User | null = await this.userRepository.findOneBy({ id: addUserDto.userid})
		const user = addUserDto.user;
		if (channel == null || user == null)
			throw new NotFoundException();
		channel.users.push(user);
		return this.channelRepository.save(channel);
	}	

	async rm(rmUserDto: RmUserDto) {
		const channel: Channel | null = await this.channelRepository.findOne({
			relations: { users: true },
			where: {
				id: rmUserDto.chanid
			}
			});
		// const user: User | null = await this.userRepository.findOneBy({ id: rmUserDto.userid})
		// const user: User | null = await this.userService.getById(rmUserDto.userid);
		const user = rmUserDto.user;
		if (channel == null || user == null)
			throw new NotFoundException();
		channel.users.splice(channel.users.indexOf(user, 0) ,1);
		return this.channelRepository.save(channel);
	}

	async update(id: number, channelUpdate: any) {		
		const channel = await this.channelRepository.findOne({
			relations: { users: true, /* owner: true */ },
			where: {
				id,
			}
		});
		if (channel) {
			if (channelUpdate.channame)
				channel.name = channelUpdate.channame;
			// if (channelUpdate.owner)
			// 	channel.owner = channelUpdate.owner;
			if (channelUpdate.users)
				channel.users = channelUpdate.users;
			if (channelUpdate.password)
				channel.users = channelUpdate.password;
		
		  return await this.channelRepository.save(channel);
		}
		return 'There is no user to update';
	  }

	getById(id: number) {
		return this.channelRepository.findOne({
			relations: { users: true },
			where: {
				id: id
			}
		});
	  }

	  getByName(name: string) {
		return this.channelRepository.findOne({
			relations: { users: true },
			where: {
				name: name
			}
		});
	  }

	  async muteUser(muteUserDto: MuteUserDto) {
		const channel: Channel | null = await this.channelRepository.findOne({
			relations: { users: true },
			where: { id: muteUserDto.chanid }
		});
		const user = await this.userService.getById(muteUserDto.userid);
		if (channel === null || user === null)
			throw new BadRequestException();
		channel.muted.push(user);
		return this.channelRepository.save(channel);
	}
	
	  async banUser(muteUserDto: MuteUserDto) {
		const channel: Channel | null = await this.channelRepository.findOne({
			relations: { users: true },
			where: { id: muteUserDto.chanid }
		});
		const user = await this.userService.getById(muteUserDto.userid);
		if (channel === null || user === null)
			throw new BadRequestException();
		channel.banned.push(user);
		return this.channelRepository.save(channel);
	  }

	  getAll() {
		return this.channelRepository.find();
	  }

	  getPublic() {
		return this.channelRepository.find({
			where: {chanType: 0,}, 
		})
	  }

	  async unmuteUser(muteUserDto: MuteUserDto) {
		const channel: Channel | null = await this.channelRepository.findOne({
			relations: { users: true },
			where: { id: muteUserDto.chanid }
		});
		const user = await this.userService.getById(muteUserDto.userid);
		if (channel === null || user === null)
			throw new BadRequestException();
		channel.muted.splice(channel.muted.indexOf(user, 0), 1);
		return this.channelRepository.save(channel);
	}

	async isUserMuted(muteUserDto: MuteUserDto) {
		const channel: Channel | null = await this.channelRepository.findOne({
			relations: { users: true },
			where: { id: muteUserDto.chanid }
		});
		const user = await this.userService.getById(muteUserDto.userid);
		if (channel === null || user === null)
			throw new BadRequestException();
		if (!channel.muted)
			return false;
		channel.muted.forEach(muted => {
			if (muted === user)
				return true;
		});
		return false;			
	}

	async isUserBanned(muteUserDto: MuteUserDto) {
		const channel: Channel | null = await this.channelRepository.findOne({
			relations: { users: true },
			where: { id: muteUserDto.chanid }
		});
		const user = await this.userService.getById(muteUserDto.userid);
		if (channel === null || user === null)
			throw new BadRequestException();
		if (!channel.banned)
			return false;
		channel.banned.forEach(banned => {
			if (banned === user)
				return true;
		});
		return false;			
	}

	async addAdmin(giveAdminDto: GiveAdminDto)
	{
		const channel: Channel | null = await this.channelRepository.findOne({
			relations: { users: true },
			where: {
				id: giveAdminDto.chanid
			}
			});
		const user = await this.userService.getById(giveAdminDto.userid);
		if (channel == null || user == null)
			throw new NotFoundException();
		channel.owner.push(user);
		return this.channelRepository.save(channel);
	}
}

import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { User } from "src/user/entities/user.entity";
import { GameService } from "./game.service";
import { userList } from "src/app.gateway";
import { UserService } from "src/user/user.service";
import { BadRequestException, UnauthorizedException, UseFilters } from "@nestjs/common";
import { GatewayExceptionFilter } from "src/app.exceptionFilter";

export interface Move {
	left: boolean;
	right: boolean;
}

@UseFilters(new GatewayExceptionFilter())
@WebSocketGateway({
	cors: { //Might remove it after merge since it's already in main.ts
		origin: '*',
	},
})

export class PongGateway implements OnGatewayDisconnect, OnGatewayInit {
	@WebSocketServer()
	server: Server;
	userService: UserService;
	inviteList: number[];
	
	constructor(private gameService: GameService) {
		this.inviteList = new Array<number>;
	}
	
	afterInit(server: Server) {
	}
	
	findByID(id: number)
	{
		let i: number = 0;
		while (i < userList.length)
		{
			if (userList[i].handshake.auth.user.id === id)
				return (userList[i].handshake.auth.user);
			i++;
		}
		return null;
	}

	isInInvite(id: number)
	{
		let i : number = 0;
		while (i < this.inviteList.length)
		{
			if (this.inviteList[i] === id)
				return true;
			i++;
		}
		return false;
	}

	removeInvite(id: number)
	{
		let i : number = 0;
		while (i < this.inviteList.length)
		{
			if (this.inviteList[i] === id)
			{
				this.inviteList.splice(i, 1);
				return;
			}
		}
	}

	handleDisconnect(client: any) {
		this.gameService.playerDisconnect(client.id);
		this.gameService.removeFromWaitingRoom(client.id);
	}

	@SubscribeMessage("addToWaitingRoom")
	HandleAddToWaitingRoom(@ConnectedSocket() client: Socket) {
		// this.gameService.addToWaitingRoom(userList[userList.indexOf(client)]);
		if (this.isInInvite(client.handshake.auth.user.id) === true)
		{
			console.log("Already in Invite")
			return;
		}

		this.gameService.addToWaitingRoom(client);
		this.gameService.startGame(this.server);
	}

	@SubscribeMessage("spectateGame")
	async HandleSpectator(@MessageBody() playerId: number, @ConnectedSocket() client: Socket) {
		
		let i: number = 0;
		let player: User | null = await this.userService.getById(playerId);
		// let player = this.findByID(playerId);
		if (player === null)
			throw new BadRequestException("UserToSpectate not found");
		while (i < this.gameService.gameRoom.length && player) {
			if (this.gameService.gameRoom[i].gameState.player1.name === player.username
				|| this.gameService.gameRoom[i].gameState.player2.name === player.username) {
				this.gameService.gameRoom[i].addSpectator(client.id);
				const socketLocal = this.findSocketFromUser(client.handshake.auth.user);
				if (socketLocal != null)
					this.server.to(socketLocal.id).emit("SpectateStart", i + 1, 0);
				return;
			}
			i++;
		}
	}

	findSocketFromUser(user: User) {
		for (const iterator of userList) {
			if (iterator.handshake.auth.user.id === user.id)
				return iterator;
		}
		return null;
	}

	findSocketById(userId: number) {
		for (const iterator of userList) {
			if (iterator.handshake.auth.user.id === userId)
				return iterator;
		}
		return null;
	}

	@SubscribeMessage("createCustomGame")
	async HandleCustomGame(@MessageBody() payload: any, @ConnectedSocket() client: Socket) {
		// let user2: User | null = await this.userService.getById(payload.user2);
		// if (user2 === null)
		// 	throw new BadRequestException("UserToSpectate not found");
		if (!payload.user2 || !client.handshake.auth.user)
			return;
		this.gameService.removeFromWaitingRoom(client.id);
		if (this.isInInvite(payload.user2.id) || this.isInInvite(client.handshake.auth.user.id))
		{
			console.log("[CreateCustomGame] One of the two users is currently busy.");
			throw new UnauthorizedException("One of the two users is currently busy.");

			return;
		}
		else {
			const socket = this.findSocketFromUser(payload.user2);
			if (socket != null)
			{
				this.server.to(socket.id).emit("invitationInGame", payload);
				this.inviteList.push(client.handshake.auth.user.id);
				this.inviteList.push(payload.user2.id);
				setTimeout(() => {
					if (client.handshake.auth.user.id)
						this.removeInvite(client.handshake.auth.user.id);
					if (payload.user2.id)
						this.removeInvite(payload.user2.id);
					// this.server.to(client.id).emit("GameDeclined", payload.user2.username);
				  }, 11000)
			}
		}
	}

	@SubscribeMessage("acceptCustomGame")
	AcceptCustomGame(@MessageBody() payload: any, @ConnectedSocket() client: Socket) {
		let user1: User = this.findByID(payload.user1);
		let user2: User = payload.user2;

		// Remove both users from InviteList, the can now invite and be invited again
		if (user1.id)
			this.removeInvite(user1.id);
		if (user2.id)
			this.removeInvite(user2.id);
		this.gameService.removeFromWaitingRoom(client.id);

		if (user2 === null)
			throw new BadRequestException("User2 doesn't exist");
		console.log("Add " + user1.username + " and " + user2.username + " to custom game.");
		let userSocket1: any = userList[0]; //By default both user are the first user of the list
		let userSocket2: any = userList[0]; //By default both user are the first user of the list
		let i: number = 0;
		while (i < userList.length) {
			if (userList[i].handshake.auth.user.id === user1.id) {
				userSocket1 = userList[i];
				break;
			}
			i++;
		}
		i = 0;
		while (i < userList.length) {
			if (userList[i].handshake.auth.user.id === user2.id) {
				userSocket2 = userList[i];
				break;
			}
			i++;
		}
		this.gameService.startCustomGame(this.server, userSocket1, userSocket2, payload.extra, parseInt(payload.scoreMax));
	}

	@SubscribeMessage("declineCustomGame")
	DeclineCustomGame(@MessageBody() payload: any, @ConnectedSocket() client: Socket) {
		let user1: User = this.findByID(payload.user1);
		let user2: User = payload.user2;

		// Remove both users from InviteList, the can now invite and be invited again
		if (user1.id)
			this.removeInvite(user1.id);
		if (user2.id)
			this.removeInvite(user2.id);
		let socket : any = this.findSocketFromUser(user1);
		this.server.to(socket.id).emit("GameDeclined", user2.username);

	}

	@SubscribeMessage("GameEnd")
	HandleEnd(@MessageBody() input: Move, @ConnectedSocket() client: Socket) {
		if (this.gameService.gameRoom.length > 0)
			this.gameService.EndGame(client.id, this.server);
	}

	@SubscribeMessage("PlayerLeft")
	HandlePlayerLeft(@MessageBody() input: Move, @ConnectedSocket() client: any) {
		this.gameService.playerDisconnect(client.id);
	}

	@SubscribeMessage("Move1")
	HandleMove1(@MessageBody() payload: any, @ConnectedSocket() client: Socket) {
		let input : Move = {left: payload.input.left, right: payload.input.right};	
		this.gameService.updateMove1(input, client.id, payload.roomId);
	}

	@SubscribeMessage("Move2")
	HandleMove2(@MessageBody() payload: any, @ConnectedSocket() client: Socket) {
		let input : Move = {left: payload.input.left, right: payload.input.right};
		this.gameService.updateMove2(input, client.id, payload.roomId);
	}
}

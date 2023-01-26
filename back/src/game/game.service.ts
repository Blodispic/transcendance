import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Socket } from "dgram";
import { start } from "repl";
import { Server } from "socket.io";
import { Results } from "src/results/entities/results.entity";
import { User } from "src/user/entities/user.entity";
import { UserService } from "src/user/user.service";
import { Repository } from "typeorm";
import { GameInfo } from "./entities/game.entity";
import { Ball, GameState, Move, Player, Vec2 } from "./game.interfaces";

@Injectable()
export class GameService {
	constructor(
		private readonly userService: UserService,
	) {}
	public waitingRoom: User[] = [];
	public waitingRoomSocket: any[] = [];
	public gameRoom: Game[] = [];

	async addToWaitingRoom(user: User, client: any) {
		this.waitingRoom.push(user);
		this.waitingRoomSocket.push(client);
	}

	startGame(server: Server) {
		if (this.waitingRoom.length >= 2) {
			const user1 = this.waitingRoom.shift();
			const user2 = this.waitingRoom.shift();
			let player1: Player = {
				paddle: {
					position: {
						x: GAME_INTERNAL_WIDTH / 2 - paddleDimensions.x / 2,
						y: GAME_INTERNAL_WIDTH * GAME_RATIO - paddleDimensions.y,
					},
					speed: vector_zero(),
					angle: 0,
				},
				input: inputdefault,
				name: "Player1",
				score: 0,
				side: 0,
				socket: this.waitingRoomSocket.shift(),
			};
			let player2: Player = {
				paddle: {
					position: {
						x: GAME_INTERNAL_WIDTH / 2 - paddleDimensions.x / 2,
						y: 0,
					},
					speed: vector_zero(),
					angle: 0,
				},
				input: inputdefault,
				name: "Player2",
				score: 0,
				side: 1,
				socket: this.waitingRoomSocket.shift(),
			};
			if (user1)
				player1.name = user1.username;
			if (user2)
				player2.name = user2.username;
			this.gameRoom.push(new Game(server, player1, player2));
			server.to(player1.socket).emit("RoomStart", this.gameRoom.length, player1);
			server.to(player2.socket).emit("RoomStart", this.gameRoom.length, player2);
			console.log("RoomStart ID: " + this.gameRoom.length);
		}
		else
			return ('Waiting for more Players...');
	}

	updateMove1(move1: Move, client: string) {
		let roomId : number = 0;
		while (roomId < this.gameRoom.length && this.gameRoom.length > 0)
		{
			if (this.gameRoom[roomId].gameState.player1.socket == client)
				this.gameRoom[roomId].updateMove1(move1);
			roomId++;
		}
	}

	updateMove2(move2: Move, client: string) {
		let roomId : number = 0;
		while (roomId < this.gameRoom.length && this.gameRoom.length > 0)
		{
			if (this.gameRoom[roomId].gameState.player2.socket == client)
				this.gameRoom[roomId].updateMove2(move2);
			roomId++;
		}
	}

	EndGame(client: string)
	{
		let roomId : number = 0;
		while (roomId < this.gameRoom.length && this.gameRoom.length > 0)
		{
			if (this.gameRoom[roomId].gameState.player1.socket == client)
			{
				this.gameRoom.splice(roomId);
				console.log("Room removed");
				return;
			}
			else if (this.gameRoom[roomId].gameState.player2.socket == client)
			{
				this.gameRoom.splice(roomId);
				console.log("Room removed");
				return;
			}
			roomId++;
		}
	}
}

const GAME_RATIO = 1.5;
const GAME_INTERNAL_WIDTH = 700;

const vector_zero = (): Vec2 => ({ x: 0, y: 0 });

let inputdefault: Move = { right: false, left: false };

let move1: Move = { ...inputdefault };
let move2: Move = { ...inputdefault };
let paddleDimensions: Vec2 = { x: 100, y: 10 };
let ballRadius: number = 10;


let balldefault: Ball = {
	position: vector_zero(),
	speed: vector_zero(),
	previous: vector_zero(),
	cooldown: 0,
};

let gameStateDefault: GameState = {
	area: { x: GAME_INTERNAL_WIDTH, y: GAME_INTERNAL_WIDTH * GAME_RATIO },
	scale: 1,
	scoreMax: 3,
	resetCooldown: 60,
	client_area: vector_zero(),
	player1: {
		paddle: {
			position: vector_zero(),
			speed: vector_zero(),
			angle: 0,
		},
		input: inputdefault,
		name: "Player1",
		score: 0,
		side: 0,
		socket: "",
	},
	player2: {
		paddle: {
			position: vector_zero(),
			speed: vector_zero(),
			angle: 0,
		},
		input: inputdefault,
		name: "Player2",
		score: 0,
		side: 1,
		socket: "",
	},
	ball: balldefault,
	gameFinished: false,
};

class Game {
	server: Server;
	public gameState: GameState;

	constructor(server: Server, user1: Player, user2: Player) {
		this.server = server;
		this.gameState = gameStateDefault;
		this.resetState(this.gameState); 
		this.gameState.player1 = user1
		this.gameState.player2 = user2;
		this.gameState.player1.score = 0;
		this.gameState.player2.score = 0;

		this.gameRoomRun();
	}

	gameRoomRun()
	{
		var intervalId = setInterval(() => {
			this.gameState = this.updateState(this.gameState);
			if (this.gameState.gameFinished == true)
				clearInterval(intervalId);
		}, 1000 / 60);
	}

	updateMove1(newMove1:Move)
	{
		console.log("Move1 received: left:" + newMove1.left + " right: " + newMove1.right);
		move1 = newMove1;
	}

	updateMove2(newMove2:Move)
	{
	console.log("Move2 received: left:" + newMove2.left + " right: " + newMove2.right);
		move2 = newMove2;
	}

	updateGameState(state: GameState) {
		state.scale = state.client_area.x / state.area.x;
		
		state.player1.input = { ...move1 };
		state.player2.input = { ...move2 };
		if (state.player1.score === state.scoreMax || state.player2.score === state.scoreMax)
		{
			state.gameFinished = true;
		}
		this.server.on("Move1", (newMove1: Move) => {
			console.log("Move1 received: left:" + newMove1.left + " right: " + newMove1.right);
			move1 = newMove1;
		})
		this.server.on("Move2", (newMove2: Move) => { 
			console.log("Move2 received: left:" + newMove2.left + " right: " + newMove2.right);
			move2 = newMove2;
		})
		if (state.resetCooldown <= 0 && state.gameFinished === false)
		{
			this.movePlayer(state.player1, state);
			this.movePlayer(state.player2, state);
			this.wallCollision(state.ball, state);
			this.moveBall(state.ball);
		}
		else if (state.gameFinished === false)
			state.resetCooldown--;
		return state;
	}

	paddleCollision(ball: Ball, player: Player) {
	    if (ball.cooldown === 0) {
	        if (
	            ((ball.previous.y - ballRadius <
	                player.paddle.position.y - paddleDimensions.y / 2 &&
	                ball.position.y + ballRadius >
	                player.paddle.position.y - paddleDimensions.y / 2) ||
	                (ball.previous.y + ballRadius >
	                    player.paddle.position.y + paddleDimensions.y / 2 &&
	                    ball.position.y - ballRadius <
	                    player.paddle.position.y + paddleDimensions.y / 2)) &&
	            ball.position.x + ballRadius > player.paddle.position.x &&
	            ball.position.x - ballRadius <
	            player.paddle.position.x + paddleDimensions.x
	        ) {
	            if (player.side === 0) {
	                if (
	                    (player.input.left &&
	                        player.input.right &&
	                        ball.previous.y < player.paddle.position.y) ||
	                    (player.input.left === false &&
	                        player.input.right === false &&
	                        ball.previous.y > player.paddle.position.y)
	                )
	                    ball.speed.y = ball.speed.y * (Math.random() * (2 - 1.5) + 1.5);
	                else if (
	                    player.input.left === false &&
	                    player.input.right === false &&
	                    ball.previous.y < player.paddle.position.y
	                )
	                    ball.speed.y = ball.speed.y * (Math.random() * (1 - 0.8) + 0.8);
	            } else {
	                if (
	                    (player.input.left &&
	                        player.input.right &&
	                        ball.previous.y > player.paddle.position.y) ||
	                    (player.input.left === false &&
	                        player.input.right === false &&
	                        ball.previous.y < player.paddle.position.y)
	                )
	                    ball.speed.y = ball.speed.y * (Math.random() * (2 - 1.5) + 1.5);
	                else if (
	                    player.input.left &&
	                    player.input.right &&
	                    ball.previous.y > player.paddle.position.y
	                )
	                    ball.speed.y = ball.speed.y * (Math.random() * (1 - 0.8) + 0.8);
	            }
		
	            if (
	                (ball.previous.y < player.paddle.position.y && ball.speed.y > 0) ||
	                (ball.previous.y > player.paddle.position.y && ball.speed.y < 0)
	            ) {
	                ball.speed.y = -ball.speed.y;
	                if (ball.speed.y > 0) ball.position.y += 5;
	                else ball.position.y -= 5;
	            } else {
	                if (ball.speed.y > 0) ball.position.y += 5;
	                else ball.position.y -= 5;
	            }
	            ball.cooldown = 1;
	            return 1;
	        }
	    }
	    return 0;
	}
		
	wallCollision(ball: Ball, state: GameState) {
	    if (
	        ball.position.x + ballRadius > state.area.x ||
	        ball.position.x - ballRadius < 0
	    )
	        ball.speed.x = -ball.speed.x;
	    if (
	        this.paddleCollision(ball, state.player1) === 0 &&
	        this.paddleCollision(ball, state.player2) === 0
	    ) {
	        if (ball.position.y > state.area.y - ballRadius) {
	            state.player2.score++;
	            this.resetState(state);
	            if (state.player2.score === state.scoreMax)
	            {
	                //END THE GAME
					console.log("Player2 Wins");
					state.gameFinished = true;
					let result: any = {winner: state.player2.name, looser: state.player1.name, winner_score: state.player2.score.toString(), looser_score: state.player1.score.toString()};
					this.server.to(this.gameState.player1.socket).emit("GameEnd", result);
					this.server.to(this.gameState.player2.socket).emit("GameEnd", result);
				}
			} else if (ball.position.y < 0 + ballRadius) {
				state.player1.score++;
				this.resetState(state);
				if (state.player1.score === state.scoreMax)
				{
					//END THE GAME
					console.log("Player1 Wins");
					state.gameFinished = true;
					let result: any = {winner: state.player1.name, looser: state.player2.name, winner_score: state.player1.score.toString(), looser_score: state.player2.score.toString()};
					this.server.to(this.gameState.player1.socket).emit("GameEnd", result);
					this.server.to(this.gameState.player2.socket).emit("GameEnd", result);
				}
			}
		}
	}
		
	resetState(state: GameState) {
		state.resetCooldown = 60;
		state.player1.paddle.position = {
			x: state.area.x / 2 - paddleDimensions.x / 2,
			y: state.area.y - paddleDimensions.y,
		};
		if (state.player1.score === state.scoreMax || state.player2.score === state.scoreMax)
		{
			state.gameFinished = true;
		}
		else
		{
			state.gameFinished = false;
		}
		state.player1.paddle.speed = { x: 0, y: 0 };
		state.player1.paddle.angle = 0;
		
		state.player2.paddle.position = {
			x: state.area.x / 2 - paddleDimensions.x / 2,
			y: 0,
		};
		state.player2.paddle.speed = { x: 0, y: 0 };
		state.player2.paddle.angle = 0;

		state.ball.position = { x: state.area.x / 2 - 10, y: state.area.y / 2 - 10 };
		state.ball.speed = { x: 5, y: 1 };
		state.ball.previous = { x: state.area.x / 2 - 10, y: state.area.y / 2 - 10 };

		state.ball.speed.x = (Math.random() * (20) - 10);
		if (state.player1.score > state.player2.score)
		    state.ball.speed.y = Math.random() * (5 - 1.5) + 1.5;
		else state.ball.speed.y = -(Math.random() * (5 - 1.5) + 1.5);
	}
		
	moveBall(ball: Ball) {
	    ball.previous.x = ball.position.x;
	    ball.previous.y = ball.position.y;
	    if (ball.speed.y > 12)
	        ball.speed.y = 12;
	    else if (ball.speed.y < -12)
	        ball.speed.y = -12;
	    else if (ball.speed.y < 4 && ball.speed.y > 0)
	        ball.speed.y = 4;
	    else if (ball.speed.y > -4 && ball.speed.y < 0)
	        ball.speed.y = -4;
	    if (ball.speed.x > 15)
	        ball.speed.x = 15;
	    else if (ball.speed.x < -15)
	        ball.speed.x = -15;
	    else if (ball.speed.x < 1 && ball.speed.x > 0)
	        ball.speed.x = 1;
	    else if (ball.speed.x > -1 && ball.speed.x < 0)
	        ball.speed.x = -1;
	    ball.position.x += ball.speed.x;
	    ball.position.y += ball.speed.y;
	    if (ball.cooldown > 0) ball.cooldown--;
	}
		
	movePlayer(player: Player, state: GameState) {
		player.paddle.speed = { x: 0, y: 0 };
		if (player.side === 0) {
			if (player.input.left && player.input.right)
				player.paddle.speed.y = -4;
			else if (player.input.left && player.paddle.position.x > 0)
				player.paddle.speed.x = -8;
			else if (player.input.right && player.paddle.position.x < state.area.x - paddleDimensions.x)
				player.paddle.speed.x = 8;
			else if (player.paddle.position.y + paddleDimensions.y < state.area.y)
				player.paddle.speed.y = 2;
		}
		else {
			if (player.input.left && player.input.right)
				player.paddle.speed.y = 4;
			else if (player.input.left && player.paddle.position.x > 0)
				player.paddle.speed.x = -8;
			else if (player.input.right && player.paddle.position.x < state.area.x - paddleDimensions.x)
				player.paddle.speed.x = 8;
			else if (player.paddle.position.y > 0)
				player.paddle.speed.y = -2;
		}
		player.paddle.position.x += player.paddle.speed.x;
		player.paddle.position.y += player.paddle.speed.y;
	}

	updateState(gameState: GameState)
	{
		gameState = this.updateGameState({ ...gameState });
		this.server.to(this.gameState.player1.socket).emit("UpdateState", gameState);
		this.server.to(this.gameState.player2.socket).emit("UpdateState", gameState);
		return gameState;
	}
}
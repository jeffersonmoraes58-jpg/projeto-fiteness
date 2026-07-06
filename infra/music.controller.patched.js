"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MusicController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../../decorators/public.decorator");

let MusicController = class MusicController {
    formatDuration(seconds) {
        if (!seconds) return '';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
    async search(q) {
        const clientId = process.env.JAMENDO_CLIENT_ID;
        if (!clientId) {
            throw new common_1.HttpException('Player de música não configurado', common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
        const query = (q && q.trim()) || 'workout';
        const url = new URL('https://api.jamendo.com/v3.0/tracks/');
        url.searchParams.set('client_id', clientId);
        url.searchParams.set('format', 'json');
        url.searchParams.set('search', query);
        url.searchParams.set('audioformat', 'mp32');
        url.searchParams.set('limit', '12');
        url.searchParams.set('order', 'popularity_total');
        url.searchParams.set('include', 'musicinfo');
        try {
            const res = await fetch(url.toString());
            if (!res.ok) throw new Error(`Jamendo HTTP ${res.status}`);
            const data = await res.json();
            return (data.results || []).map((t) => ({
                trackId: String(t.id),
                title: t.name,
                thumbnail: t.album_image || '',
                author: t.artist_name,
                duration: this.formatDuration(t.duration),
                audioUrl: t.audiodownload || t.audio,
            }));
        } catch (err) {
            console.error('Jamendo API error:', err.message);
            throw new common_1.HttpException('Erro ao buscar músicas', common_1.HttpStatus.BAD_GATEWAY);
        }
    }
};
exports.MusicController = MusicController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('search'),
    (0, swagger_1.ApiOperation)({ summary: 'Buscar músicas (Jamendo)' }),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MusicController.prototype, "search", null);
exports.MusicController = MusicController = __decorate([
    (0, swagger_1.ApiTags)('music'),
    (0, common_1.Controller)('music')
], MusicController);
//# sourceMappingURL=music.controller.js.map

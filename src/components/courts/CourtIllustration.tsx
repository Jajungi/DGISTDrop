import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Rect,
  Line,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Text as SvgText,
  Ellipse,
  Pattern,
  Circle,
} from 'react-native-svg';
import type { Court } from '@/src/types';
import {
  COURT_FLOOR_COLORS,
  COURT_FLOOR_DARK,
  COACH_COURT_ACCENT,
  COURT_LINE_COLOR,
  COURT_NET_COLOR,
  COURT_VENUE_LIGHT,
  GAME_MODE_CONFIG,
  NANTA_HALF_LABEL,
  normalizeNantaHalf,
  getCourtBounds,
  getCourtHeight,
  getLandscapeCourtGeometry,
} from '@/src/constants/court';

interface CourtIllustrationProps {
  court: Court;
  width: number;
  borderRadius?: number;
}

export function CourtIllustration({ court, width, borderRadius: radius = 0 }: CourtIllustrationProps) {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 0;
  const height = getCourtHeight(safeWidth);
  if (safeWidth < 2 || height < 2) {
    return <View style={{ width: Math.max(0, safeWidth), height: Math.max(0, height) }} />;
  }
  const lineW = 1;
  const isLit = court.status === 'playing';
  const isEmpty = court.status === 'empty';
  const isReserved = court.status === 'reserved';
  const isCooling = court.status === 'just_finished';
  const floorMain = COURT_FLOOR_COLORS[court.status];
  const floorEdge = COURT_FLOOR_DARK[court.status];
  const lineOpacity = isEmpty ? 0.45 : 1;
  /** 카드 전체 비네팅 — 최소한만 */
  const vignetteTop = isEmpty ? 0.05 : 0.02;
  const vignetteBottom = isEmpty ? 0.08 : 0.03;

  const { x: bx, y: by, w: bw, h: bh } = getCourtBounds(width, height);
  const lines = getLandscapeCourtGeometry(width, height);

  /** 코트 라인 박스 끝(좌·우 베이스라인) 페더 */
  const courtEndFade = Math.max(3, bw * 0.045);
  const courtSideFade = Math.max(2, bh * 0.06);
  const courtEndOpacity = isEmpty ? 0.07 : 0.045;
  const courtSideOpacity = isEmpty ? 0.04 : 0.025;
  /** 카드 외곽 림 페더 */
  const rimFade = Math.max(6, width * 0.055);
  const rimOpacity = 0.14;
  /** 모서리 페더 — 직각 카드라 아주 은은하게만 */
  const cornerSoft = width * 0.07;
  const cornerOpacity = isEmpty ? 0.09 : 0.06;
  const hasMode = court.gameMode && court.status !== 'empty';
  const isNanta = court.gameMode === 'nanta' && court.nantaHalf && court.status !== 'empty';
  const nantaHalf = normalizeNantaHalf(court.nantaHalf);
  const netX = lines.netX;
  const halfH = bh / 2;
  const dividerY = lines.centerY;
  const activeY = nantaHalf === 'near' ? by : dividerY;
  const inactiveY = nantaHalf === 'near' ? dividerY : by;
  const netLineOpacity = isNanta ? lineOpacity * 0.12 : lineOpacity;
  const modeColor = hasMode ? GAME_MODE_CONFIG[court.gameMode!].color : undefined;
  const labelSize = Math.max(7, Math.min(11, width * 0.055));
  const gradId = `court-${court.id}`;
  const runoff = Math.max(2, width * 0.018);
  const postW = Math.max(1.2, bw * 0.012);
  const postH = Math.max(2.5, bh * 0.055);
  const wallH = by * 0.72;
  const benchW = Math.max(3, width * 0.028);
  const benchH = Math.max(8, bh * 0.14);
  const markLen = Math.max(2, bh * 0.04);

  return (
    <View style={[styles.wrap, { width, height, borderRadius: radius, backgroundColor: floorMain }]}>
      <Svg width={width} height={height}>
        <Defs>
          <Pattern id={`tex-${gradId}`} patternUnits="userSpaceOnUse" width={6} height={6}>
            <Rect width={6} height={6} fill={floorMain} />
            <Line x1={0} y1={6} x2={6} y2={0} stroke="rgba(0,0,0,0.045)" strokeWidth={0.4} />
          </Pattern>
          <Pattern id={`clean-${gradId}`} patternUnits="userSpaceOnUse" width={5} height={5} patternTransform="rotate(45)">
            <Line x1={0} y1={0} x2={0} y2={5} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
          </Pattern>

          <LinearGradient id={`floor-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={floorMain} />
            <Stop offset="0.72" stopColor={floorMain} />
            <Stop offset="1" stopColor={floorEdge} />
          </LinearGradient>

          <LinearGradient id={`court-end-l-${gradId}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#000000" stopOpacity={courtEndOpacity} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={`court-end-r-${gradId}`} x1="1" y1="0" x2="0" y2="0">
            <Stop offset="0" stopColor="#000000" stopOpacity={courtEndOpacity} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={`court-side-t-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity={courtSideOpacity} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={`court-side-b-${gradId}`} x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor="#000000" stopOpacity={courtSideOpacity} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0} />
          </LinearGradient>

          <LinearGradient id={`rim-l-${gradId}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={floorEdge} stopOpacity={rimOpacity} />
            <Stop offset="1" stopColor={floorEdge} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={`rim-r-${gradId}`} x1="1" y1="0" x2="0" y2="0">
            <Stop offset="0" stopColor={floorEdge} stopOpacity={rimOpacity} />
            <Stop offset="1" stopColor={floorEdge} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={`rim-t-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={floorEdge} stopOpacity={rimOpacity * 0.7} />
            <Stop offset="1" stopColor={floorEdge} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={`rim-b-${gradId}`} x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={floorEdge} stopOpacity={rimOpacity * 0.85} />
            <Stop offset="1" stopColor={floorEdge} stopOpacity={0} />
          </LinearGradient>

          <LinearGradient id={`vignette-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#000000" stopOpacity={vignetteTop} />
            <Stop offset="42%" stopColor="#000000" stopOpacity={0} />
            <Stop offset="58%" stopColor="#000000" stopOpacity={0} />
            <Stop offset="100%" stopColor="#000000" stopOpacity={vignetteBottom} />
          </LinearGradient>

          <RadialGradient
            id={`corner-tl-${gradId}`}
            cx={0}
            cy={0}
            r={cornerSoft}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor={floorEdge} stopOpacity={cornerOpacity} />
            <Stop offset="65%" stopColor={floorEdge} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient
            id={`corner-tr-${gradId}`}
            cx={width}
            cy={0}
            r={cornerSoft}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor={floorEdge} stopOpacity={cornerOpacity} />
            <Stop offset="65%" stopColor={floorEdge} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient
            id={`corner-bl-${gradId}`}
            cx={0}
            cy={height}
            r={cornerSoft}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor={floorEdge} stopOpacity={cornerOpacity * 1.1} />
            <Stop offset="65%" stopColor={floorEdge} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient
            id={`corner-br-${gradId}`}
            cx={width}
            cy={height}
            r={cornerSoft}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor={floorEdge} stopOpacity={cornerOpacity * 1.1} />
            <Stop offset="65%" stopColor={floorEdge} stopOpacity={0} />
          </RadialGradient>

          {isLit && (
            <>
              {/* 천장에서 부드럽게 내려오는 확산광 (세로 그라디언트) */}
              <LinearGradient id={`lit-wash-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={COURT_VENUE_LIGHT} stopOpacity={0.5} />
                <Stop offset="20%" stopColor={COURT_VENUE_LIGHT} stopOpacity={0.28} />
                <Stop offset="48%" stopColor={COURT_VENUE_LIGHT} stopOpacity={0.1} />
                <Stop offset="100%" stopColor={COURT_VENUE_LIGHT} stopOpacity={0} />
              </LinearGradient>
              {/* 램프 아래로 번지는 빛 웅덩이 — 다단계로 자연스럽게 감쇠 */}
              <RadialGradient
                id={`lit-pool-l-${gradId}`}
                cx={width * 0.34}
                cy={2}
                rx={width * 0.4}
                ry={height * 0.66}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0%" stopColor="#FFFDF0" stopOpacity={0.24} />
                <Stop offset="30%" stopColor="#FFFDF0" stopOpacity={0.12} />
                <Stop offset="62%" stopColor="#FFFDF0" stopOpacity={0.035} />
                <Stop offset="100%" stopColor="#FFFDF0" stopOpacity={0} />
              </RadialGradient>
              <RadialGradient
                id={`lit-pool-r-${gradId}`}
                cx={width * 0.66}
                cy={2}
                rx={width * 0.4}
                ry={height * 0.66}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0%" stopColor="#FFFDF0" stopOpacity={0.24} />
                <Stop offset="30%" stopColor="#FFFDF0" stopOpacity={0.12} />
                <Stop offset="62%" stopColor="#FFFDF0" stopOpacity={0.035} />
                <Stop offset="100%" stopColor="#FFFDF0" stopOpacity={0} />
              </RadialGradient>
            </>
          )}

          {isReserved && (
            <>
              <LinearGradient id={`reserve-wash-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#FFE6A0" stopOpacity={0.4} />
                <Stop offset="35%" stopColor="#FFE6A0" stopOpacity={0.16} />
                <Stop offset="100%" stopColor="#FFE6A0" stopOpacity={0} />
              </LinearGradient>
              <RadialGradient
                id={`reserve-pool-${gradId}`}
                cx={width * 0.5}
                cy={2}
                rx={width * 0.5}
                ry={height * 0.62}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0%" stopColor="#FFE6A0" stopOpacity={0.3} />
                <Stop offset="42%" stopColor="#FFE6A0" stopOpacity={0.12} />
                <Stop offset="100%" stopColor="#FFE6A0" stopOpacity={0} />
              </RadialGradient>
            </>
          )}
        </Defs>

        {/* 바닥 + 마루 질감 */}
        <Rect x={0} y={0} width={width} height={height} rx={radius} ry={radius} fill={`url(#floor-${gradId})`} />
        <Rect x={0} y={0} width={width} height={height} rx={radius} ry={radius} fill={`url(#tex-${gradId})`} opacity={isEmpty ? 0.35 : 0.55} />

        {/* 후면 벽 · 측면 여백 */}
        <Rect x={0} y={0} width={width} height={wallH} fill="rgba(0,0,0,0.14)" />
        <Rect x={0} y={by + bh} width={width} height={height - by - bh} fill="rgba(0,0,0,0.08)" />
        <Rect x={0} y={by} width={bx} height={bh} fill="rgba(0,0,0,0.06)" />
        <Rect x={bx + bw} y={by} width={width - bx - bw} height={bh} fill="rgba(0,0,0,0.06)" />

        {/* 관람·대기 벤치 (측면) */}
        <Rect x={bx * 0.35} y={by + bh * 0.38} width={benchW} height={benchH} rx={1} fill="rgba(0,0,0,0.18)" opacity={lineOpacity} />
        <Rect x={width - bx * 0.35 - benchW} y={by + bh * 0.38} width={benchW} height={benchH} rx={1} fill="rgba(0,0,0,0.18)" opacity={lineOpacity} />

        {/* 경기 중 — 천장 확산광 + 번지는 빛 웅덩이 */}
        {isLit && (
          <>
            <Rect x={0} y={0} width={width} height={height} rx={radius} ry={radius} fill={`url(#lit-wash-${gradId})`} />
            <Rect x={0} y={0} width={width} height={height} fill={`url(#lit-pool-l-${gradId})`} />
            <Rect x={0} y={0} width={width} height={height} fill={`url(#lit-pool-r-${gradId})`} />
          </>
        )}

        {/* 예약됨 — 은은한 대기 조명 */}
        {isReserved && (
          <>
            <Rect x={0} y={0} width={width} height={height} rx={radius} ry={radius} fill={`url(#reserve-wash-${gradId})`} />
            <Rect x={0} y={0} width={width} height={height} fill={`url(#reserve-pool-${gradId})`} />
          </>
        )}

        {/* 정리 중 — 빗자국 패턴 */}
        {isCooling && (
          <Rect x={bx} y={by} width={bw} height={bh} fill={`url(#clean-${gradId})`} opacity={0.9} />
        )}

        {/* 런오프(코트 외곽 여유) 테두리 */}
        <Rect
          x={bx - runoff}
          y={by - runoff}
          width={bw + runoff * 2}
          height={bh + runoff * 2}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={0.6}
          opacity={lineOpacity * 0.85}
        />

        {/* 코트 라인 */}
        <Rect x={bx} y={by} width={bw} height={bh} fill="none" stroke={COURT_LINE_COLOR} strokeWidth={lineW} opacity={lineOpacity} />
        <Line
          x1={netX}
          y1={by}
          x2={netX}
          y2={by + bh}
          stroke={COURT_NET_COLOR}
          strokeWidth={1.8}
          opacity={netLineOpacity}
        />

        {/* 네트 기둥 · 헤드테이프 */}
        <Rect x={netX - postW / 2} y={by - postH * 0.25} width={postW} height={postH} fill="rgba(255,255,255,0.88)" opacity={lineOpacity} rx={0.4} />
        <Rect x={netX - postW / 2} y={by + bh - postH * 0.75} width={postW} height={postH} fill="rgba(255,255,255,0.88)" opacity={lineOpacity} rx={0.4} />
        <Rect x={netX - 0.6} y={by - 1.5} width={1.2} height={2.5} fill="rgba(255,255,255,0.95)" opacity={lineOpacity} />
        <Line x1={netX - bw * 0.06} y1={by + 0.5} x2={netX + bw * 0.06} y2={by + 0.5} stroke="rgba(255,255,255,0.55)" strokeWidth={0.8} opacity={lineOpacity} />

        {/* 센터 서비스 마크 */}
        <Line x1={netX - markLen} y1={lines.centerY} x2={netX + markLen} y2={lines.centerY} stroke={COURT_LINE_COLOR} strokeWidth={lineW} opacity={0.5 * lineOpacity} />
        <Line x1={lines.shortServiceLeft} y1={by + markLen} x2={lines.shortServiceLeft} y2={by + bh - markLen} stroke={COURT_LINE_COLOR} strokeWidth={lineW * 0.5} opacity={0.25 * lineOpacity} />
        <Line x1={lines.shortServiceRight} y1={by + markLen} x2={lines.shortServiceRight} y2={by + bh - markLen} stroke={COURT_LINE_COLOR} strokeWidth={lineW * 0.5} opacity={0.25 * lineOpacity} />

        {/* 코트 중앙점 (서비스 개시) */}
        <Circle cx={netX} cy={lines.centerY} r={Math.max(0.8, width * 0.008)} fill={COURT_LINE_COLOR} opacity={0.35 * lineOpacity} />

        <Line
          x1={bx}
          y1={lines.singlesTop}
          x2={bx + bw}
          y2={lines.singlesTop}
          stroke={COURT_LINE_COLOR}
          strokeWidth={lineW * 0.8}
          opacity={0.55 * lineOpacity}
          strokeDasharray="3 2"
        />
        <Line
          x1={bx}
          y1={lines.singlesBottom}
          x2={bx + bw}
          y2={lines.singlesBottom}
          stroke={COURT_LINE_COLOR}
          strokeWidth={lineW * 0.8}
          opacity={0.55 * lineOpacity}
          strokeDasharray="3 2"
        />
        <Line
          x1={lines.shortServiceLeft}
          y1={by}
          x2={lines.shortServiceLeft}
          y2={by + bh}
          stroke={COURT_LINE_COLOR}
          strokeWidth={lineW * 0.75}
          opacity={0.45 * lineOpacity}
        />
        <Line
          x1={lines.shortServiceRight}
          y1={by}
          x2={lines.shortServiceRight}
          y2={by + bh}
          stroke={COURT_LINE_COLOR}
          strokeWidth={lineW * 0.75}
          opacity={0.45 * lineOpacity}
        />
        <Line
          x1={lines.longServiceLeft}
          y1={by}
          x2={lines.longServiceLeft}
          y2={by + bh}
          stroke={COURT_LINE_COLOR}
          strokeWidth={lineW * 0.7}
          opacity={0.35 * lineOpacity}
        />
        <Line
          x1={lines.longServiceRight}
          y1={by}
          x2={lines.longServiceRight}
          y2={by + bh}
          stroke={COURT_LINE_COLOR}
          strokeWidth={lineW * 0.7}
          opacity={0.35 * lineOpacity}
        />
        <Line
          x1={lines.longServiceLeft}
          y1={lines.centerY}
          x2={lines.shortServiceLeft}
          y2={lines.centerY}
          stroke={COURT_LINE_COLOR}
          strokeWidth={lineW * 0.75}
          opacity={0.4 * lineOpacity}
        />
        <Line
          x1={lines.shortServiceRight}
          y1={lines.centerY}
          x2={lines.longServiceRight}
          y2={lines.centerY}
          stroke={COURT_LINE_COLOR}
          strokeWidth={lineW * 0.75}
          opacity={0.4 * lineOpacity}
        />

        {/* 난타: 무대·입구 방향 가로 반코트 (네트 기준 좌우 분할 아님) */}
        {isNanta && (
          <>
            <Rect x={bx} y={inactiveY} width={bw} height={halfH} fill="rgba(0,0,0,0.52)" />
            <Rect
              x={bx}
              y={activeY}
              width={bw}
              height={halfH}
              fill={GAME_MODE_CONFIG.nanta.activeFloorTint}
            />
            <Rect
              x={bx}
              y={activeY}
              width={bw}
              height={halfH}
              fill="none"
              stroke={GAME_MODE_CONFIG.nanta.color}
              strokeWidth={2}
              opacity={0.9}
            />
            <Line
              x1={bx}
              y1={dividerY}
              x2={bx + bw}
              y2={dividerY}
              stroke={GAME_MODE_CONFIG.nanta.color}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.85}
            />
            <SvgText
              x={bx + bw / 2}
              y={inactiveY + halfH / 2 + 3}
              fill="rgba(255,255,255,0.42)"
              fontSize={labelSize}
              fontWeight="600"
              textAnchor="middle"
            >
              미사용
            </SvgText>
            <SvgText
              x={bx + bw / 2}
              y={activeY + (nantaHalf === 'near' ? 12 : halfH - 5)}
              fill="rgba(255,255,255,0.88)"
              fontSize={labelSize}
              fontWeight="700"
              textAnchor="middle"
            >
              {NANTA_HALF_LABEL[nantaHalf]}
            </SvgText>
          </>
        )}

        {/* 일반·랭크: 코트 테두리 색 구분 */}
        {hasMode && !isNanta && modeColor && (
          <Rect
            x={bx}
            y={by}
            width={bw}
            height={bh}
            fill="none"
            stroke={modeColor}
            strokeWidth={2}
            opacity={0.65}
            rx={1}
          />
        )}

        {court.isCoachCourt && (
          <>
            <Rect x={bx} y={by + bh - 12} width={bw} height={12} fill={COACH_COURT_ACCENT} opacity={0.82} />
            <SvgText x={bx + bw / 2} y={by + bh - 3} fill="rgba(255,255,255,0.9)" fontSize={7} fontWeight="600" textAnchor="middle">
              COACH
            </SvgText>
          </>
        )}

        {/* 코트 번호 · 방향 (바닥 마킹) */}
        <SvgText
          x={bx + bw * 0.12}
          y={by + bh - 4}
          fill="rgba(255,255,255,0.22)"
          fontSize={Math.max(14, width * 0.14)}
          fontWeight="800"
          opacity={lineOpacity}
        >
          {court.id}
        </SvgText>
        <SvgText
          x={bx + bw / 2}
          y={by + 9}
          fill="rgba(255,255,255,0.28)"
          fontSize={Math.max(5, width * 0.038)}
          fontWeight="600"
          textAnchor="middle"
          opacity={lineOpacity}
        >
          STAGE
        </SvgText>

        {isCooling && (
          <SvgText
            x={bx + bw / 2}
            y={by + bh / 2 + 3}
            fill="rgba(255,255,255,0.55)"
            fontSize={labelSize}
            fontWeight="700"
            textAnchor="middle"
          >
            정리 중
          </SvgText>
        )}

        {/* 코트 끝(베이스라인·사이드) 은은한 페더 */}
        <Rect x={bx} y={by} width={courtEndFade} height={bh} fill={`url(#court-end-l-${gradId})`} />
        <Rect x={bx + bw - courtEndFade} y={by} width={courtEndFade} height={bh} fill={`url(#court-end-r-${gradId})`} />
        <Rect x={bx} y={by} width={bw} height={courtSideFade} fill={`url(#court-side-t-${gradId})`} />
        <Rect x={bx} y={by + bh - courtSideFade} width={bw} height={courtSideFade} fill={`url(#court-side-b-${gradId})`} />

        {/* 카드 외곽 림 페더 */}
        <Rect x={0} y={0} width={rimFade} height={height} fill={`url(#rim-l-${gradId})`} />
        <Rect x={width - rimFade} y={0} width={rimFade} height={height} fill={`url(#rim-r-${gradId})`} />
        <Rect x={0} y={0} width={width} height={rimFade} fill={`url(#rim-t-${gradId})`} />
        <Rect x={0} y={height - rimFade} width={width} height={rimFade} fill={`url(#rim-b-${gradId})`} />

        {/* 모서리 라운드 페더 */}
        <Rect x={0} y={0} width={cornerSoft} height={cornerSoft} fill={`url(#corner-tl-${gradId})`} />
        <Rect x={width - cornerSoft} y={0} width={cornerSoft} height={cornerSoft} fill={`url(#corner-tr-${gradId})`} />
        <Rect x={0} y={height - cornerSoft} width={cornerSoft} height={cornerSoft} fill={`url(#corner-bl-${gradId})`} />
        <Rect x={width - cornerSoft} y={height - cornerSoft} width={cornerSoft} height={cornerSoft} fill={`url(#corner-br-${gradId})`} />

        {/* 가장자리 비네팅 (아주 약하게) */}
        <Rect x={0} y={0} width={width} height={height} rx={radius} ry={radius} fill={`url(#vignette-${gradId})`} />

        {/* 천장 램프 — 겹친 타원으로 부드러운 블룸(번짐) 표현 */}
        {isLit && (
          <>
            <Ellipse cx={width * 0.34} cy={4} rx={13} ry={6} fill="#F4FBDC" opacity={0.16} />
            <Ellipse cx={width * 0.34} cy={4} rx={8} ry={3.4} fill="#F8FCE4" opacity={0.42} />
            <Ellipse cx={width * 0.34} cy={4} rx={4.4} ry={1.7} fill="rgba(255,255,248,0.95)" />
            <Ellipse cx={width * 0.66} cy={4} rx={13} ry={6} fill="#F4FBDC" opacity={0.16} />
            <Ellipse cx={width * 0.66} cy={4} rx={8} ry={3.4} fill="#F8FCE4" opacity={0.42} />
            <Ellipse cx={width * 0.66} cy={4} rx={4.4} ry={1.7} fill="rgba(255,255,248,0.95)" />
          </>
        )}

        {isReserved && (
          <>
            <Ellipse cx={width * 0.5} cy={5} rx={11} ry={5} fill="#FFE0A0" opacity={0.16} />
            <Ellipse cx={width * 0.5} cy={5} rx={6} ry={2.4} fill="#FFE8B4" opacity={0.42} />
            <Ellipse cx={width * 0.5} cy={5} rx={3.4} ry={1.3} fill="rgba(255,245,220,0.92)" />
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
});

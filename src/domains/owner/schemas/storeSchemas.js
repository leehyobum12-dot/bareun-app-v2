// src/domains/owner/schemas/storeSchemas.js

import { z } from 'zod'

/*
 * [공통] 전화번호: 빈 문자열 허용 (선택 입력)
 * isPhone 검증과 동일한 정규식
 */
const phoneSchema = z
  .string()
  .regex(/^0\d{1,2}-?\d{3,4}-?\d{4}$/, '연락처 형식이 올바르지 않습니다. (예: 064-123-4567)')
  .or(z.literal(''))
  .optional()

/*
 * [공통] 사업자등록번호: 123-45-67890 또는 1234567890
 */
const bizNumberSchema = z
  .string()
  .regex(/^\d{3}-?\d{2}-?\d{5}$/, '사업자등록번호 형식이 올바르지 않습니다. (예: 123-45-67890)')

/*
 * StoreEdit — 가게 운영 정보 수정
 */
export const storeEditSchema = z.object({
  // [기존] 운영 정보
  phone: phoneSchema,
  open_time: z.string().optional(),
  close_time: z.string().optional(),
  closed_days: z.string().max(100, '100자 이내로 입력해 주세요.').optional(),
  
  // [추가] 주소 정보
  road_name: z.string().min(1, '주소를 입력해 주세요.'),
  lot_num: z.string().optional(),
  si: z.string().min(1, '시/도 정보가 필요합니다.'),
  emd: z.string().min(1, '읍/면/동 정보가 필요합니다.'),
  lat: z.number({ required_error: '좌표가 필요합니다. 주소 검색을 사용해 주세요.' }).nullable(),
  lng: z.number({ required_error: '좌표가 필요합니다. 주소 검색을 사용해 주세요.' }).nullable(),
})

/*
 * MenuManager — 메뉴·영양소 관리
 */
export const menuSchema = z.object({
  main_menu: z.string().min(1, '대표 메뉴 이름을 입력해 주세요.').max(40, '40자 이내로 입력해 주세요.'),
  est_sodium_mg: z.string().min(1, '나트륨 함량을 입력해 주세요. (모르면 대략적인 추정치)'),
  is_measurable: z.boolean(),
  avoid_tags: z.array(z.string()),
})

/*
 * StoreRegistration — 신규 등록 / 연동 서류 제출
 * (Phase 2-d에서 적용)
 */
export const storeRegistrationSchema = z.object({
  store_name: z.string().min(1, '가게 이름을 입력해 주세요.').max(40, '40자 이내로 입력해 주세요.'),
  biz_type: z.string().min(1, '업종을 선택해 주세요.'),
  phone: phoneSchema,
  road_name: z.string().min(1, '주소를 검색해 주세요.'),
  lot_num: z.string().optional(),
  si: z.string().optional(),
  emd: z.string().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  business_days: z.array(z.string()),
  open_time: z.string().optional(),
  close_time: z.string().optional(),
  closed_days: z.string().max(100).optional(),
  certs: z.array(z.string()),
  biz_reg_number: bizNumberSchema,
})
/**
 * Column Name Translator
 * 영어 컬럼명을 한글로 번역하는 유틸리티
 * 컬럼 코멘트가 없을 때 AI가 더 나은 쿼리를 생성할 수 있도록 지원
 */

// 일반적인 컬럼명 매핑 (영어 -> 한글)
const COMMON_COLUMN_TRANSLATIONS: Record<string, string> = {
    // 식별자
    'id': '고유번호',
    'uuid': '고유식별자',
    'code': '코드',
    'key': '키',
    'seq': '순번',
    'no': '번호',
    'num': '번호',
    'number': '번호',
    
    // 사용자 관련
    'user': '사용자',
    'user_id': '사용자 ID',
    'userId': '사용자 ID',
    'username': '사용자명',
    'user_name': '사용자명',
    'name': '이름',
    'first_name': '이름',
    'firstName': '이름',
    'last_name': '성',
    'lastName': '성',
    'full_name': '전체이름',
    'fullName': '전체이름',
    'nickname': '닉네임',
    'email': '이메일',
    'phone': '전화번호',
    'phone_number': '전화번호',
    'phoneNumber': '전화번호',
    'mobile': '휴대폰',
    'password': '비밀번호',
    'pwd': '비밀번호',
    'role': '역할',
    'roles': '역할목록',
    'permission': '권한',
    'permissions': '권한목록',
    'avatar': '프로필이미지',
    'profile': '프로필',
    'bio': '소개',
    'age': '나이',
    'gender': '성별',
    'birth': '생년월일',
    'birthday': '생년월일',
    'birth_date': '생년월일',
    'birthDate': '생년월일',
    'address': '주소',
    'city': '도시',
    'country': '국가',
    'zip': '우편번호',
    'zipcode': '우편번호',
    'postal_code': '우편번호',
    
    // 시간 관련
    'created': '생성일시',
    'created_at': '생성일시',
    'createdAt': '생성일시',
    'created_date': '생성일',
    'createdDate': '생성일',
    'updated': '수정일시',
    'updated_at': '수정일시',
    'updatedAt': '수정일시',
    'modified': '수정일시',
    'modified_at': '수정일시',
    'modifiedAt': '수정일시',
    'deleted': '삭제일시',
    'deleted_at': '삭제일시',
    'deletedAt': '삭제일시',
    'date': '날짜',
    'time': '시간',
    'datetime': '일시',
    'timestamp': '타임스탬프',
    'start_date': '시작일',
    'startDate': '시작일',
    'end_date': '종료일',
    'endDate': '종료일',
    'due_date': '마감일',
    'dueDate': '마감일',
    'expire': '만료일',
    'expires_at': '만료일시',
    'expiresAt': '만료일시',
    
    // 상태 관련
    'status': '상태',
    'state': '상태',
    'active': '활성여부',
    'is_active': '활성여부',
    'isActive': '활성여부',
    'enabled': '활성화',
    'is_enabled': '활성화여부',
    'isEnabled': '활성화여부',
    'disabled': '비활성화',
    'is_deleted': '삭제여부',
    'isDeleted': '삭제여부',
    'visible': '표시여부',
    'is_visible': '표시여부',
    'isVisible': '표시여부',
    'published': '게시여부',
    'is_published': '게시여부',
    'isPublished': '게시여부',
    'approved': '승인여부',
    'is_approved': '승인여부',
    'verified': '인증여부',
    'is_verified': '인증여부',
    'locked': '잠금여부',
    'is_locked': '잠금여부',
    
    // 콘텐츠 관련
    'title': '제목',
    'subject': '제목',
    'content': '내용',
    'body': '본문',
    'text': '텍스트',
    'message': '메시지',
    'description': '설명',
    'desc': '설명',
    'summary': '요약',
    'note': '메모',
    'notes': '메모',
    'comment': '댓글',
    'comments': '댓글목록',
    'reply': '답글',
    'tag': '태그',
    'tags': '태그목록',
    'category': '카테고리',
    'categories': '카테고리목록',
    'type': '유형',
    'kind': '종류',
    'label': '라벨',
    'priority': '우선순위',
    'level': '레벨',
    'order': '순서',
    'sort': '정렬순서',
    'sort_order': '정렬순서',
    'sortOrder': '정렬순서',
    'rank': '순위',
    'position': '위치',
    
    // 수량/금액 관련
    'count': '개수',
    'total': '합계',
    'amount': '금액',
    'price': '가격',
    'cost': '비용',
    'fee': '수수료',
    'quantity': '수량',
    'qty': '수량',
    'stock': '재고',
    'balance': '잔액',
    'point': '포인트',
    'points': '포인트',
    'score': '점수',
    'rate': '비율',
    'ratio': '비율',
    'percent': '퍼센트',
    'percentage': '퍼센트',
    'discount': '할인',
    'tax': '세금',
    'weight': '무게',
    'width': '너비',
    'height': '높이',
    'length': '길이',
    'size': '크기',
    
    // 파일 관련
    'file': '파일',
    'filename': '파일명',
    'file_name': '파일명',
    'fileName': '파일명',
    'path': '경로',
    'url': 'URL',
    'image': '이미지',
    'img': '이미지',
    'photo': '사진',
    'video': '동영상',
    'audio': '음성',
    'document': '문서',
    'attachment': '첨부파일',
    'extension': '확장자',
    'mime': 'MIME타입',
    'mime_type': 'MIME타입',
    
    // 조직 관련
    'company': '회사',
    'organization': '조직',
    'org': '조직',
    'department': '부서',
    'dept': '부서',
    'team': '팀',
    'group': '그룹',
    'branch': '지점',
    'division': '본부',
    
    // 주문/거래 관련
    'order_id': '주문번호',
    'orderId': '주문번호',
    'invoice': '송장',
    'payment': '결제',
    'transaction': '거래',
    'product': '상품',
    'product_id': '상품번호',
    'productId': '상품번호',
    'item': '항목',
    'sku': 'SKU코드',
    'shipping': '배송',
    'delivery': '배달',
    'customer': '고객',
    'customer_id': '고객번호',
    'customerId': '고객번호',
    'vendor': '공급업체',
    'supplier': '공급자',
    
    // 기타
    'version': '버전',
    'ip': 'IP주소',
    'ip_address': 'IP주소',
    'ipAddress': 'IP주소',
    'user_agent': '브라우저정보',
    'userAgent': '브라우저정보',
    'locale': '지역',
    'language': '언어',
    'lang': '언어',
    'timezone': '시간대',
    'currency': '통화',
    'token': '토큰',
    'session': '세션',
    'secret': '비밀키',
    'api_key': 'API키',
    'apiKey': 'API키',
    'parent': '상위',
    'parent_id': '상위ID',
    'parentId': '상위ID',
    'child': '하위',
    'children': '하위목록',
    'ref': '참조',
    'reference': '참조',
    'source': '출처',
    'target': '대상',
    'origin': '원본',
    'reason': '사유',
    'result': '결과',
    'response': '응답',
    'request': '요청',
    'action': '액션',
    'event': '이벤트',
    'log': '로그',
    'history': '이력',
    'data': '데이터',
    'meta': '메타데이터',
    'metadata': '메타데이터',
    'config': '설정',
    'settings': '설정',
    'options': '옵션',
    'params': '매개변수',
    'parameters': '매개변수',
    'extra': '추가정보',
    'attributes': '속성',
    'properties': '속성',
};

// 접미사 패턴 매핑
const SUFFIX_TRANSLATIONS: Record<string, string> = {
    '_id': ' ID',
    '_ids': ' ID목록',
    '_at': ' 일시',
    '_on': ' 일자',
    '_by': ' 담당자',
    '_count': ' 수',
    '_num': ' 번호',
    '_flag': ' 여부',
    '_yn': ' 여부',
    '_cd': ' 코드',
    '_code': ' 코드',
    '_name': ' 명',
    '_nm': ' 명',
    '_date': ' 날짜',
    '_time': ' 시간',
    '_url': ' URL',
    '_path': ' 경로',
    '_type': ' 유형',
    '_status': ' 상태',
};

// 접두사 패턴 매핑
const PREFIX_TRANSLATIONS: Record<string, string> = {
    'is_': '',
    'has_': '',
    'can_': '',
    'fk_': '외래키_',
    'pk_': '기본키_',
    'idx_': '인덱스_',
};

/**
 * 영어 컬럼명을 한글로 번역
 */
export function translateColumnName(columnName: string, comment?: string): string {
    // 코멘트가 있으면 그대로 사용
    if (comment && comment.trim()) {
        return comment.trim();
    }

    // 소문자로 변환하여 매칭
    const lowerName = columnName.toLowerCase();

    // 직접 매핑 확인
    if (COMMON_COLUMN_TRANSLATIONS[lowerName]) {
        return COMMON_COLUMN_TRANSLATIONS[lowerName];
    }

    // 언더스코어/카멜케이스 분리
    const parts = splitColumnName(columnName);
    
    // 각 부분 번역 시도
    const translatedParts = parts.map(part => {
        const lower = part.toLowerCase();
        return COMMON_COLUMN_TRANSLATIONS[lower] || part;
    });

    // 조합하여 반환
    const result = translatedParts.join(' ');
    
    // 결과가 원본과 같으면 camelCase를 읽기 쉽게 변환
    if (result === parts.join(' ')) {
        return formatReadable(columnName);
    }

    return result;
}

/**
 * 컬럼명을 부분으로 분리 (snake_case, camelCase 지원)
 */
function splitColumnName(name: string): string[] {
    // snake_case 분리
    if (name.includes('_')) {
        return name.split('_').filter(p => p.length > 0);
    }

    // camelCase 분리
    return name
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .toLowerCase()
        .split('_')
        .filter(p => p.length > 0);
}

/**
 * 읽기 쉬운 형태로 포맷팅
 */
function formatReadable(name: string): string {
    return name
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * 스키마의 모든 컬럼에 한글 번역 추가
 */
export function translateSchemaColumns(columns: Array<{ name: string; comment?: string; type?: string }>): Array<{ name: string; koreanName: string; type?: string; comment?: string }> {
    return columns.map(col => ({
        ...col,
        koreanName: translateColumnName(col.name, col.comment),
    }));
}

/**
 * AI 프롬프트용 스키마 컨텍스트 생성
 */
export function buildSchemaContextForAI(
    tables: Array<{
        name: string;
        columns: Array<{ name: string; type: string; comment?: string }>;
    }>
): string {
    const lines: string[] = ['[데이터베이스 스키마]'];

    for (const table of tables) {
        lines.push(`\n테이블: ${table.name}`);
        lines.push('컬럼:');
        
        for (const col of table.columns) {
            const koreanName = translateColumnName(col.name, col.comment);
            const typeInfo = col.type ? ` (${col.type})` : '';
            lines.push(`  - ${col.name}${typeInfo}: ${koreanName}`);
        }
    }

    return lines.join('\n');
}

/**
 * 일반적인 비즈니스 테이블명 번역
 */
export function translateTableName(tableName: string): string {
    const TABLE_TRANSLATIONS: Record<string, string> = {
        'users': '사용자',
        'user': '사용자',
        'accounts': '계정',
        'account': '계정',
        'orders': '주문',
        'order': '주문',
        'products': '상품',
        'product': '상품',
        'categories': '카테고리',
        'category': '카테고리',
        'customers': '고객',
        'customer': '고객',
        'employees': '직원',
        'employee': '직원',
        'departments': '부서',
        'department': '부서',
        'invoices': '송장',
        'invoice': '송장',
        'payments': '결제',
        'payment': '결제',
        'transactions': '거래',
        'transaction': '거래',
        'logs': '로그',
        'log': '로그',
        'settings': '설정',
        'config': '설정',
        'permissions': '권한',
        'roles': '역할',
        'sessions': '세션',
        'tokens': '토큰',
        'files': '파일',
        'images': '이미지',
        'comments': '댓글',
        'posts': '게시글',
        'articles': '기사',
        'news': '뉴스',
        'notifications': '알림',
        'messages': '메시지',
        'emails': '이메일',
        'addresses': '주소',
        'contacts': '연락처',
        'companies': '회사',
        'organizations': '조직',
        'teams': '팀',
        'projects': '프로젝트',
        'tasks': '작업',
        'events': '이벤트',
        'schedules': '일정',
        'bookings': '예약',
        'reservations': '예약',
        'reviews': '리뷰',
        'ratings': '평점',
        'favorites': '즐겨찾기',
        'wishlist': '위시리스트',
        'cart': '장바구니',
        'checkout': '결제',
        'shipping': '배송',
        'delivery': '배달',
        'inventory': '재고',
        'stock': '재고',
        'suppliers': '공급업체',
        'vendors': '판매업체',
    };

    const lowerName = tableName.toLowerCase();
    return TABLE_TRANSLATIONS[lowerName] || formatReadable(tableName);
}

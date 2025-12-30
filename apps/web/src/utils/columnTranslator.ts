/**
 * Column Name Translator (Frontend)
 * 영어 컬럼명을 한글로 번역하는 프론트엔드 유틸리티
 */

// 일반적인 컬럼명 매핑 (영어 -> 한글)
const COMMON_COLUMN_TRANSLATIONS: Record<string, string> = {
    // 식별자
    'id': '고유번호',
    'uuid': '고유식별자',
    'code': '코드',
    'key': '키',
    'seq': '순번',
    
    // 사용자 관련
    'user': '사용자',
    'user_id': '사용자 ID',
    'userId': '사용자 ID',
    'username': '사용자명',
    'name': '이름',
    'first_name': '이름',
    'last_name': '성',
    'full_name': '전체이름',
    'email': '이메일',
    'phone': '전화번호',
    'password': '비밀번호',
    'role': '역할',
    'avatar': '프로필이미지',
    'age': '나이',
    'gender': '성별',
    'address': '주소',
    
    // 시간 관련
    'created_at': '생성일시',
    'createdAt': '생성일시',
    'updated_at': '수정일시',
    'updatedAt': '수정일시',
    'deleted_at': '삭제일시',
    'date': '날짜',
    'time': '시간',
    'timestamp': '타임스탬프',
    'start_date': '시작일',
    'end_date': '종료일',
    
    // 상태 관련
    'status': '상태',
    'active': '활성여부',
    'is_active': '활성여부',
    'enabled': '활성화',
    'deleted': '삭제여부',
    'published': '게시여부',
    'approved': '승인여부',
    
    // 콘텐츠 관련
    'title': '제목',
    'content': '내용',
    'body': '본문',
    'text': '텍스트',
    'message': '메시지',
    'description': '설명',
    'summary': '요약',
    'note': '메모',
    'comment': '댓글',
    'tag': '태그',
    'category': '카테고리',
    'type': '유형',
    'priority': '우선순위',
    'order': '순서',
    
    // 수량/금액 관련
    'count': '개수',
    'total': '합계',
    'amount': '금액',
    'price': '가격',
    'quantity': '수량',
    'stock': '재고',
    'point': '포인트',
    'score': '점수',
    
    // 파일 관련
    'file': '파일',
    'filename': '파일명',
    'path': '경로',
    'url': 'URL',
    'image': '이미지',
    
    // 기타
    'version': '버전',
    'parent_id': '상위ID',
    'source': '출처',
    'result': '결과',
    'data': '데이터',
    'config': '설정',
};

/**
 * 영어 컬럼명을 한글로 번역
 */
export function translateColumnName(columnName: string, comment?: string): string {
    // 코멘트가 있으면 그대로 사용
    if (comment && comment.trim()) {
        return comment.trim();
    }

    const lowerName = columnName.toLowerCase();

    // 직접 매핑 확인
    if (COMMON_COLUMN_TRANSLATIONS[lowerName]) {
        return COMMON_COLUMN_TRANSLATIONS[lowerName];
    }
    if (COMMON_COLUMN_TRANSLATIONS[columnName]) {
        return COMMON_COLUMN_TRANSLATIONS[columnName];
    }

    // 부분 매칭 시도
    const parts = columnName.split(/[_-]|(?=[A-Z])/).filter(p => p.length > 0);
    const translatedParts = parts.map(part => {
        const lower = part.toLowerCase();
        return COMMON_COLUMN_TRANSLATIONS[lower] || part;
    });

    const result = translatedParts.join(' ');
    
    // 변환이 안 된 경우 camelCase를 읽기 쉽게
    if (result === parts.join(' ')) {
        return columnName
            .replace(/_/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2');
    }

    return result;
}

/**
 * 테이블명 번역
 */
export function translateTableName(tableName: string): string {
    const TABLE_TRANSLATIONS: Record<string, string> = {
        'users': '사용자',
        'user': '사용자',
        'accounts': '계정',
        'orders': '주문',
        'products': '상품',
        'categories': '카테고리',
        'customers': '고객',
        'employees': '직원',
        'departments': '부서',
        'payments': '결제',
        'logs': '로그',
        'settings': '설정',
        'roles': '역할',
        'permissions': '권한',
        'files': '파일',
        'comments': '댓글',
        'posts': '게시글',
        'notifications': '알림',
        'messages': '메시지',
        'companies': '회사',
        'projects': '프로젝트',
        'tasks': '작업',
    };

    return TABLE_TRANSLATIONS[tableName.toLowerCase()] || tableName;
}

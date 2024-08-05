import React, { useState, useEffect, useCallback } from 'react';

import CloseImage from '../assets/close.svg';

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const DebouncedSearch = ({ onSearch, delay = 300, ...rest }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, delay);

  useEffect(() => onSearch(debouncedSearchTerm), [debouncedSearchTerm, onSearch]);

  const handleChange = (event) => {
    setSearchTerm(event.target.value);
  };

  return (
    <div className='search'>
      <input
        type="text"
        value={searchTerm}
        onChange={handleChange}
        {...rest}
      />
      <div className={`closeButton ${searchTerm.length === 0 ? 'hidden' : '' }`} onClick={() => setSearchTerm('')}>
        <img src={CloseImage} alt="Clear search" width={15} height={15} />
      </div>
    </div>
  );
};

export default DebouncedSearch;

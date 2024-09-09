import React, { useState, useEffect, useCallback } from 'react';

import RemoveIcon from '../assets/remove.png';

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
      <button className={`closeButton ${searchTerm.length === 0 ? 'hidden' : '' }`} onClick={() => setSearchTerm('')}>
        <img src={RemoveIcon} alt="Clear search" width={20} height={20} />
      </button>
    </div>
  );
};

export default DebouncedSearch;

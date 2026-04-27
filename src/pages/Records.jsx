import { useState, useEffect, useRef, useCallback } from 'react';
import { FaSearch, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import ModalNewRecord from './records/ModalNewRecord';
import ModalEditRecord from './records/ModalEditRecord';
import PlantLoading from '../components/PlantLoading';
import { api } from '../api';
import { toast } from 'sonner';

function Records() {
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dataToUpdate, setDataToUpdate] = useState(null);
  const [isEditRecord, setIsEditRecord] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  //pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [paginationMode, setPaginationMode] = useState('infinite'); // 'infinite' or 'traditional'
  const observerTarget = useRef(null);
  const isInInitialMount = useRef(true);
  const searchTimeout = useRef(null);

  const handleLoadRecords = async (page = 1, append = false) => {
    // feat: load the data from the database (number 5)
    // In traditional pagination mode, always load fresh data
    if (paginationMode === 'traditional' || append) {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
    } else {
      setIsLoading(true);
    }

    try {
      const response = await api.get('plants', {
        params: {
          page,
          per_page: 20,
        },
      });

      const payload = response.data?.data ?? response.data;
      const list = Array.isArray(payload) ? payload : [];

      if (paginationMode === 'traditional') {
        // Traditional pagination: replace records
        setRecords(list);
        setHasMore(false); // Not used in traditional pagination
      } else {
        // Infinite scroll: append records
        setRecords((prev) => (append ? [...prev, ...list] : list));
        setHasMore(list.length === 20);
      }
    } catch (error) {
      console.error(error);
      toast.error(error?.message || 'Unable to load records.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }

  const handleSearchPlants = async (query) => {
    if (!query.trim()) {
      setRecords([]);
      setHasMore(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.get('plants', {
        params: {
          search: query.trim(),
          page: 1,
          per_page: 20,
        },
      });

      const payload = response.data?.data ?? response.data;
      const list = Array.isArray(payload) ? payload : [];

      setRecords(list);
      setHasMore(false);
    } catch (error) {
      console.error(error);
      toast.error(error?.message || 'Unable to search records.');
    } finally {
      setIsLoading(false);
    }
  }
  const handleAddRecord = async (formData) => {
    try {
      // feat: make add new record functional (number 7)
      await api.post('plants', formData);
      toast.success("New record saved.");
      // Reload records to show the new entry
      handleLoadRecords(1, false);
    } catch (error) {
      console.error(error);
      toast.error("Error encountered while saving record.");
    }

    setIsModalOpen(false)
  }
  const handleUpdateRecord = async (data) => {
    try {
      // feat: make update record functional (number 8)
      await api.put(`plants/${data.id}`, data);
      toast.success("Plant data updated.");
      // Reload records to show the updated entry
      handleLoadRecords(1, false);
    } catch (error) {
      console.error(error);
      toast.error("Error encountered during update.");
    } finally {
      setIsEditRecord(false);
    }
  }
  const handleDeleteRecord = async (data) => {
    try {
      // feat: make delete record functional (number 9)
      const isDelete = confirm("Are you sure you want to delete this record?");
      if (isDelete) {
        await api.delete(`plants/${data.id}`, data);
        setRecords(prev => prev?.filter( val => data.id !== val.id))
        toast.success("Plant data deleted.");
      }
    } catch (error) {
      console.error(error)
      toast.error("Error encountered while deleting record.");
    }
  }

  // ui: implement pagination in the plants table (number 10)
  const handlePageChange = (page) => {
    setCurrentPage(page);
    handleLoadRecords(page, false);
  }

  const togglePaginationMode = () => {
    setPaginationMode(prev => prev === 'infinite' ? 'traditional' : 'infinite');
    setCurrentPage(1);
    handleLoadRecords(1, false);
  }
  const filteredRecords = searchTerm.trim() ? records : records.filter(record =>
    record.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.variety?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.seedling_source?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const loadMore = useCallback(() => {
    // feat: load paginated data loading (number 6)
    if (!isLoadingMore && hasMore && !searchTerm) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      handleLoadRecords(nextPage, true);
    }
  }, [isLoadingMore, hasMore, currentPage, searchTerm]);

  // initial record loading
  useEffect(() => {
    handleLoadRecords(1, false);
  }, []);
  // feat: load paginated data loading (number 6) - intersection observer for infinite scroll
  useEffect(() => {
    if (paginationMode !== 'infinite') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      }, { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;

    if (currentTarget) {
      observer.observe(currentTarget);
    } else {
      console.log("No target to observer.");
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    }
  }, [loadMore, paginationMode]);
  // reset pagination when searching
  useEffect(() => {
    if (isInInitialMount.current) {
      isInInitialMount.current = false;
      return;
    }

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearchPlants(searchTerm);
      } else {
        handleLoadRecords(1, false);
      }
    }, 350);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchTerm]);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div className='flex flex-grow'></div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 
          transition duration-200 flex items-center gap-2 cursor-pointer"
        >
          <FaPlus />
          Add New Record
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100 mb-6">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 
              focus:ring-green-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
          <table className="relative w-full">
            <thead className="bg-green-50 sticky top-0 z-10">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Plant Name</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Variety</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Batch Name</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Seedling Source</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Seedling Count</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Starting Fund</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Date Planted</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700"></th>
              </tr>
            </thead>
            <tbody>

              {
                isLoading && records.length === 0 ?
                  (
                    <tr>
                      <td colSpan={7} className='py-10'>
                        <PlantLoading size='2xl' variant='pulse' text="Loading records" />
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filteredRecords.map((record) => (
                        <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-6 text-sm text-gray-800 font-medium">{record.name}</td>
                          <td className="py-4 px-6 text-sm text-gray-600">{record?.variety || "-"}</td>
                          <td className="py-4 px-6 text-sm text-gray-600">{record?.batch_name || "-"}</td>
                          <td className="py-4 px-6 text-sm text-gray-800 font-medium">{record?.seedling_source || "-"}</td>
                          <td className="py-4 px-6 text-sm text-gray-600">{record?.seedling_count || "-"}</td>
                          <td className="py-4 px-6 text-sm text-gray-600">{record?.starting_fund || "0"}</td>
                          <td className="py-4 px-6 text-sm text-gray-600">{record?.date_planted || "-"}</td>
                          <td className="py-4 px-6">
                            <div className="flex gap-2">
                              <button className="cursor-pointer text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded"
                                title="Edit Record"
                                onClick={() => { setDataToUpdate(record); setIsEditRecord(true) }}>
                                <FaEdit />
                              </button>
                              <button className="cursor-pointer text-red-600 hover:text-red-700 p-2 
                                hover:bg-red-50 rounded"
                                onClick={() => { handleDeleteRecord(record) }}
                                title="Delete Record">
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {/* loading more indicator - only in infinite scroll mode */}
                      {
                        paginationMode === 'infinite' && isLoadingMore && (
                          <tr>
                            <td colSpan={8} className='py-6'>
                              <PlantLoading size='lg' variant='pulse' text="Loading more records..." />
                            </td>
                          </tr>
                        )
                      }
                      {/* intersection observer target - only in infinite scroll mode */}
                      {
                        paginationMode === 'infinite' && !searchTerm && hasMore && !isLoadingMore && (
                          <tr ref={observerTarget}>
                            <td colSpan={8} className='py-4 text-center text-gray-400 text-sm'>
                              Scroll for more...
                            </td>
                          </tr>
                        )
                      }

                    </>
                  )
              }
            </tbody>
          </table>
        </div>

        {searchTerm && filteredRecords.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No records found matching your search.
          </div>
        )}

        {/* End of Records Indicator - only in infinite scroll mode */}
        {paginationMode === 'infinite' && !hasMore && records.length > 0 && !searchTerm && (
          <div className="text-center py-4 text-gray-400 text-sm border-t border-gray-100">
            No more records to load
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {paginationMode === 'traditional' && records.length > 0 && !searchTerm && (
        <div className="flex items-center justify-between mt-4 px-4 py-3 bg-white border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-700">
            Showing page {currentPage}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={records.length < 20 || isLoading}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Pagination Mode Toggle */}
      <div className="flex justify-center mt-4">
        <button
          onClick={togglePaginationMode}
          className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Switch to {paginationMode === 'infinite' ? 'Traditional' : 'Infinite Scroll'} Pagination
        </button>
      </div>

      {/* Modal */}
      <ModalNewRecord
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddRecord}
      />

      <ModalEditRecord
        isOpen={isEditRecord}
        onClose={() => setIsEditRecord(false)}
        data={dataToUpdate}
        onSubmit={handleUpdateRecord}
      />
    </div>
  )
}

export default Records
